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
		var pathF=document.getElementById('simple.04').shadowRoot.getElementById('pathfolder');
		var descr=document.getElementById('simple.04').shadowRoot.getElementById('desc');
		var textZ=document.getElementById('simple.04').shadowRoot.getElementById('comments');
		var buttonCreate=document.getElementById('simple.04').shadowRoot.getElementById('create');
		var buttonModif=document.getElementById('simple.04').shadowRoot.getElementById('modify');
		pathF.textContent= pathChest;
		if(utils.isAntaresStudy(pathChest)){//It's a study
			descr.textContent= "This folder is an Antares study, it cannot be used as a chest.";
			textZ.disabled=true;
			buttonCreate.disabled=true;
			buttonModif.disabled=true;
		}
		else if(utils.isAdoFolder(pathChest)){//it's already a chest
			descr.textContent= "This is already a chest, you can update its comments.";
			textZ.disabled=false;
			buttonCreate.disabled=true;
			buttonModif.disabled=false;
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
		}
		else{//there is a problem
			descr.textContent= "This is not a compatible path. Please select another one.";
			textZ.disabled=true;
			buttonCreate.disabled=true;
			buttonModif.disabled=true;
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
			<h2>Choose target <u onClick="Editor.Ipc.sendToPanel('simple.04','openChest')">folder</u> :</h2>
			<p id="pathfolder">Undefined</p>
		</div>
		<p id="desc">No folder selected.</p>
		<div id="textDiv">
			<h3>Enter comments :</h3>
			<textarea disabled id="comments"></textarea>
		</div>
		<div id ="buttons">
			<button type="button" id="create" disabled title="Create a new chest with these comments" onClick="Editor.Ipc.sendToPanel('simple.04','create')">Create</button>
			<button type="button" id="modify" disabled title="Update chest with these comments" onClick="Editor.Ipc.sendToPanel('simple.04','modify')">Update</button>
		</div>
	</div>
	`,
listeners: {
	},
messages: {
		openChest(){
			Editor.Panel.focus('simple.04');
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{
			properties: [ 'openDirectory'] });
			
			if(getPath){
				pathChest=getPath[0];
				afficher();
			}
		},
		modify(){
			if(utils.isAdoFolder(pathChest))
			{
				fs.writeFileSync(path.join(pathChest,"info.ado"),document.getElementById('simple.04').shadowRoot.getElementById('comments').value);
				afficher();
			}
			else
			{
				window.alert("Invalid target, please select another folder");
			}
		},
		create(){
			if(fs.isDirectorySync(pathChest)&& !utils.isAdoFolder(pathChest))
			{
				fs.writeFileSync(path.join(pathChest,"info.ado"),document.getElementById('simple.04').shadowRoot.getElementById('comments').value);
				os.checkIcon(pathChest);
				afficher();
			}
			else
			{
				window.alert("Invalid target, please select another folder");
			}
		},
		openFromData(){
			pathChest=remote.getGlobal('sharedObj').globalChest;
			afficher();
			Editor.Panel.focus('simple.04');
		}
	},
});


