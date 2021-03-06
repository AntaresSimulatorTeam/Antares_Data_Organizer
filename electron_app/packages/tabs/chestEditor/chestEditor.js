/*
** Copyright 2016-2019 RTE
** Author: Sylvain Marandon
**
** This file is part of Antares_Data_Organizer.
**
** Antares_Data_Organizer is free software: you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation, either version 3 of the License, or
** (at your option) any later version.
**
** Antares_Data_Organizer is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with Antares_Data_Organizer. If not, see <http://www.gnu.org/licenses/>.
**
** SPDX-License-Identifier: GPL-3.0
*/

'use strict'; //More warnings and errors

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-plus');
const path = require('path');
const du = require('du');
const winston= require('winston');
const fsUtils = require("nodejs-fs-utils");
const electron = require('electron');
const remote = electron.remote;
const app = remote.app;
const shell = require('electron').shell;
global.rootRequire = function(name) {
	return require(app.getAppPath() + '/' + name);
}
const jsonTag= rootRequire('src/configTags.json');
const utils = rootRequire('src/utils.js');
const common = rootRequire('src/common.js');
var os;
var tmpDir;
if(process.platform=="win32"){
	os = rootRequire('src/windows.js');
	tmpDir=process.env.TMP;
}
if(process.platform=="linux"){
	os = rootRequire('src/linux.js');
	tmpDir="/tmp";
}
const dialog = remote.dialog;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Usefull declarations and global variables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var pathChest="";
var globalChest=remote.getGlobal('sharedObj').globalChest; 

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Display functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Refresh all the interface
function afficher(){
	if (pathChest!="")
	{
		var pathF=document.getElementById('tabs.04').shadowRoot.getElementById('pathfolder');
		var descr=document.getElementById('tabs.04').shadowRoot.getElementById('desc');
		var textZ=document.getElementById('tabs.04').shadowRoot.getElementById('comments');
		var buttonCreate=document.getElementById('tabs.04').shadowRoot.getElementById('create');
		var buttonModif=document.getElementById('tabs.04').shadowRoot.getElementById('modify');
		var buttonDelete=document.getElementById('tabs.04').shadowRoot.getElementById('delete');
		pathF.textContent= pathChest;
		textZ.value="";
		if(utils.isAntaresStudy(pathChest)){//It's a study
			descr.textContent= "This folder is an Antares study, it cannot be used as a chest.";
			textZ.disabled=true;
			buttonCreate.disabled=true;
			buttonModif.disabled=true;
			buttonDelete.disabled=true;
		}
		else if(utils.isChest(pathChest)){//it's already a chest
			descr.textContent= "This is already a chest, you can update its comments.";
			textZ.disabled=false;
			buttonCreate.disabled=true;
			buttonModif.disabled=false;
			buttonDelete.disabled=false;
			var commentsPath=path.join(pathChest,"info.ado");
			if(fs.existsSync(commentsPath)){
				var lines=fs.readFileSync(commentsPath, 'utf8');
				textZ.value=lines;
			}
			os.checkIcon(pathChest);
		}
		else if(fs.isDirectorySync(pathChest)){//it's a normal folder
			descr.textContent= "This folder is not a chest yet, you can create one here.";
			textZ.disabled=false;
			buttonCreate.disabled=false;
			buttonModif.disabled=true;
			buttonDelete.disabled=true;
		}
		else{//there is a problem
			descr.textContent= "This is not a compatible path. Please select another one.";
			textZ.disabled=true;
			buttonCreate.disabled=true;
			buttonModif.disabled=true;
			buttonDelete.disabled=true;
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Utility functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



Editor.Panel.extend({
style: `
	h1 {
		color: #999;
	}
	#pathfolder {
		position : relative;
		top:9px;
		left : 5px;
	}
	#desc{
		margin-top:0px;
		position : relative;
		top:-10px;
		left : 5px;
	}
	#display{
		position:relative;
		top:-10px;
		left:3px;
		display: flex;
	}
	#comments{
		position:relative;
		height:100%;
		resize: none;
		width:100%;
		top:-5px;
	}
	#textDiv{
		position:absolute;
		bottom: 80px;
		top:50px;
		right : 5px;
		left : 5px;
	}
	#buttons{
		position: absolute;
		bottom:8px;
		width : 100%;
		text-align:center;
	}
	#create{
		margin:auto;
	}
	`,

template: `
	<style> @import "./general.css"; </style>
	<div style="width=100%;height:100%;" id="maindiv">
		<div id="display">
			<h2>Choose target <u onClick="Editor.Ipc.sendToPanel('tabs.04','openChest')">folder</u> :</h2>
			<p id="pathfolder">Undefined</p>
		</div>
		<p id="desc">No folder selected.</p>
		<div id="textDiv">
			<h3>Enter comments :</h3>
			<textarea disabled id="comments"></textarea>
		</div>
		<div id ="buttons">
			<button type="button" id="create" disabled title="Create a new chest with these comments" onClick="Editor.Ipc.sendToPanel('tabs.04','create')">Make</button>
			<button type="button" id="modify" disabled title="Update chest with these comments" onClick="Editor.Ipc.sendToPanel('tabs.04','modify')">Update</button>
			<button type="button" id="delete" disabled title="Turn this chest into a regular folder" onClick="Editor.Ipc.sendToPanel('tabs.04','deleteChest')">Unmake</button>
		</div>
	</div>
	`,
listeners: {
	},
messages: {
		openChest(){
			Editor.Panel.focus('tabs.04');
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{
			properties: [ 'openDirectory'] });
			
			if(getPath){
				pathChest=getPath[0];
				afficher();
			}
		},
		modify(){
			if(utils.isChest(pathChest))
			{
				fs.writeFileSync(path.join(pathChest,"info.ado"),document.getElementById('tabs.04').shadowRoot.getElementById('comments').value);
				afficher();
			}
			else
			{
				window.alert("Invalid target, please select another folder");
			}
		},
		create(){
			if(fs.isDirectorySync(pathChest)&& !utils.isChest(pathChest))
			{
				fs.writeFileSync(path.join(pathChest,"info.ado"),document.getElementById('tabs.04').shadowRoot.getElementById('comments').value);
				os.checkIcon(pathChest);
				afficher();
			}
			else
			{
				window.alert("Invalid target, please select another folder");
			}
		},
		deleteChest(){
			if(fs.isDirectorySync(pathChest)&& utils.isChest(pathChest))
			{
				try{
					fs.unlink(path.join(pathChest,"info.ado"));
					os.delIcon(pathChest);
					afficher();
				}
				catch(err){
					//do nothing
				}
			}
			else
			{
				window.alert("Invalid target, please select another folder");
			}
		},
		openFromData(){
			pathChest=remote.getGlobal('sharedObj').globalChest;
			afficher();
			Editor.Panel.focus('tabs.04');
		}
	},
});


