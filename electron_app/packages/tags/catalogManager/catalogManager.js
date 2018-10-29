'use strict'; //More warnings and errors

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries and constants used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const path = require('path');
const fs = require('fs-plus');
const electron = require('electron');
const remote = electron.remote;
const app = remote.app;
global.rootRequire = function(name) {
	return require(app.getAppPath() + '/' + name);
}
const common = rootRequire('src/common.js');
var os;
if(process.platform=="win32"){
	os = rootRequire('src/windows.js');
}
if(process.platform=="linux"){
	os = rootRequire('src/linux.js');
}
const dialog = remote.dialog;
const execSync = require('child_process').execSync;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Usefull declarations and global variables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var typeLib="all";
var pathLeft="";
var pathRight="";
var tableft=[];
var tabright=[];
var loggerActions=remote.getGlobal('sharedObj').loggerActions; 

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Display functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Refreshes only the left side
function refreshLeft(){
	tableft=[];
	if(fs.existsSync(pathLeft)){
		var leftPaths=document.getElementById('tabs.01').shadowRoot.getElementById('leftPaths');
		var leftCheck=document.getElementById('tabs.01').shadowRoot.getElementById('leftCheck');
		while (leftPaths.firstChild) {
			leftPaths.removeChild(leftPaths.firstChild);
		}
		while (leftCheck.firstChild) {
			leftCheck.removeChild(leftCheck.firstChild);
		}
		var files = fs.readdirSync(pathLeft);
		for(var i=0;i<files.length;i++){
			if((common.getExt(files[i])=="scat" && (typeLib == "all" || typeLib == "scat")) || (common.getExt(files[i])=="acat" && (typeLib == "all" || typeLib == "acat"))){
				var nouveau_li = document.createElement('li');
				var nomdossier = document.createTextNode(files[i]);
				nouveau_li.appendChild(nomdossier);
				leftPaths.appendChild(nouveau_li);
				nouveau_li.setAttribute("title", files[i]);
				tableft.push(files[i]);
			}
		}
		for(var i=0;i<tableft.length;i++){
			addCheckBox(leftCheck);
		}
	}
}

//Refreshes only the right side
function refreshRight(){
	tabright=[];
	if(fs.existsSync(pathRight)){
		var rightPaths=document.getElementById('tabs.01').shadowRoot.getElementById('rightPaths');
		var rightCheck=document.getElementById('tabs.01').shadowRoot.getElementById('rightCheck');
		while (rightPaths.firstChild) {
			rightPaths.removeChild(rightPaths.firstChild);
		}
		while (rightCheck.firstChild) {
			rightCheck.removeChild(rightCheck.firstChild);
		}
		var files = fs.readdirSync(pathRight);
		for(var i=0;i<files.length;i++){
			if((common.getExt(files[i])=="scat" && (typeLib == "all" || typeLib == "scat")) || (common.getExt(files[i])=="acat" && (typeLib == "all" || typeLib == "acat"))){
				var nouveau_li = document.createElement('li');
				var nomdossier = document.createTextNode(files[i]);
				nouveau_li.appendChild(nomdossier);
				rightPaths.appendChild(nouveau_li);
				nouveau_li.setAttribute("title", files[i]);
				tabright.push(files[i]);
			}
		}
		for(var i=0;i<tabright.length;i++){
			addCheckBox(rightCheck);
		}
	}
}

//displays both the rigt and left file lists from their path, which is a global var
function displayPaths(){
	var dispLeft=document.getElementById('tabs.01').shadowRoot.getElementById('leftDisp');
	var dispRight=document.getElementById('tabs.01').shadowRoot.getElementById('rightDisp');
	if(pathLeft!=""){
		dispLeft.textContent=pathLeft.match(/([^\\|\/]*)\/*$/)[1];
		dispLeft.setAttribute("title", pathLeft);
	}
	if(pathRight!=""){
		dispRight.textContent=pathRight.match(/([^\\|\/]*)\/*$/)[1];
		dispRight.setAttribute("title", pathRight);
	}
}

//refresh the whole panel
function afficher(){
	displayPaths();
	refreshRight();
	refreshLeft();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Utility functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Creates checkable checkbox in the provided list
function addCheckBox(list){
	var liCheck = document.createElement('li');
	var cb = document.createElement('input');
	cb.type = 'checkbox';
	liCheck.appendChild(cb);
	list.appendChild(liCheck);
}

//returns name from input if valid
function getTextIfLib(){
	var textLib=document.getElementById('tabs.01').shadowRoot.getElementById('nameLib').value;
	if(isValidFileName(textLib)){
		return textLib;
	}
	else {
		return "";
	}
}

//check if a string is a valid file name
function isValidFileName(fname){
	var rg1=/^[^\\\/:\*\?"<>\|\.]+$/; // forbidden characters \ / : * ? " < > | .
	var rg2=/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
	if(rg1.test(fname)&&!rg2.test(fname)){
		/*var fileExt=path.parse(fname).ext;
		if(fileExt==".scat" || fileExt==".acat"){
			return true;
		}
		else{
			return false;
		}*/
		return true;
	}
	else{
		return false;
	}
}


Editor.Panel.extend({
  style: `
    
	#leftdiv{
		position:absolute;
		width:50%;
		left:0;
		top:35px;
		bottom:10px;
	}
	#rightdiv{
		position:absolute;
		width:50%;
		right:0;
		top:35px;
		bottom:10px;
		border-left: thick solid #aaaaaa;
	}
	#leftdiv h2{
		text-align: center;
	}
	#rightdiv h2{
		text-align: center;
	}
	.buttonMove{
		height:30px;
		font-size: 20px;
		width:50px;
		position:absolute;
		right:50%;
		margin-right:-22px;
		top:50%;
		z-index: 5;
	}
	#moveright{
		margin-top:-50px;
	}
	#moveleft{
	}
	#concat{
		margin-top:50px;
	}
	#selectType{
		position:absolute;
		right:0px;
		display: flex;
	}
	li {
		height:26px;
		list-style-type:none;
	}
	#leftPaths{
		position:relative;
	}
	#rightPaths li{
		text-align: right;
		right:0px;
	}
	#leftCheck{
		position:relative;
		margin-left: auto;
	}
	#rightPaths{
		position:relative;
		margin-left: auto;
	}
	#rightCheck{
		position:relative;
	}
	.buttonBottom{
		position:absolute;
		bottom:3px;
	}
	#addAlibRight{
		position:absolute;
		left:5px;
	}
	#addSlibRight{
		position:absolute;
		left:82px;
	}
	#addAlibLeft{
		position:absolute;
		right:10px;
	}
	#addSlibLeft{
		position:absolute;
		right:87px;
	}
	.delete{
		position:absolute;
		right:51.4%;
		margin-right:-30px;
	}
	#nameLib{
		position:absolute;
		bottom:40px;
		width:180px;
		right:50%;
		z-index: 5;
		margin-right:-87px;
	}
	#leftDisp{
		text-align: center;
		margin-top:-10px;
	}
	#rightDisp{
		text-align: center;
		margin-top:-10px;
	}
	#leftlist{
		overflow-x:auto; 
		overflow-y:visible; 
		height:auto;
		width:90%;
		display: flex;
		position:absolute;
		left:3px;
		right:10px;
		top: 70px;
		margin-top: 0px;
		margin-right:5px;
		bottom:30px;
	}
	#rightlist{
		overflow-x:auto; 
		overflow-y:visible; 
		height:auto;
		width:90%;
		display: flex;
		position:absolute;
		left:10px;
		right:3px;
		top: 70px;
		margin-top: 0px;
		margin-left:5px;
		bottom:30px;
	}
  `,

  template: `
	<style> @import "./general.css"; </style>
	<div style="width=100%;height:100%;display: flex;" id="maindiv">
	<form id="selectType" onClick="Editor.Ipc.sendToPanel('tabs.01','changeType')">
		<input type="radio" name="libType" value="all" checked>All
		<input type="radio" name="libType" value="scat">Studies catalogs
		<input type="radio" name="libType" value="acat">Archives catalogs
	</form> 
	<div id="leftdiv">
	<h2 onClick="Editor.Ipc.sendToPanel('tabs.01','openLeft')" style="text-decoration:underline">Source :</h2>
	<p id="leftDisp">Undefined</p>
	<div class="flex-container" id="leftlist">
		<ul id="leftPaths">
		</ul>
		<ul id="leftCheck">
		</ul>
	</div>
	<button type="button" class="buttonBottom add" id="addAlibLeft" onClick="Editor.Ipc.sendToPanel('tabs.01','addAlibLeft')">New Acat</button>
	<button type="button" class="buttonBottom add" id="addSlibLeft" onClick="Editor.Ipc.sendToPanel('tabs.01','addSlibLeft')">New Scat</button>
	<button type="button" class="buttonBottom delete" id="deleteLeft" onClick="Editor.Ipc.sendToPanel('tabs.01','deleteLeft')">Delete</button>
	</div>
	<button type="button" class="buttonMove" id="moveright" title="Copy file to the right" onClick="Editor.Ipc.sendToPanel('tabs.01','moveRight')">&rArr;</button>
	<button type="button" class="buttonMove" id="moveleft" title="Copy file to the left" onClick="Editor.Ipc.sendToPanel('tabs.01','moveLeft')">&lArr;</button>
	<button type="button" class="buttonMove" id="concat" title="Copy the content of files from the left to the files on the right" onClick="Editor.Ipc.sendToPanel('tabs.01','concat')">&oplus;</button>
	<input type="text" oninput="" id="nameLib" value="catalog name"/>
	<div id="rightdiv">
	<h2 onClick="Editor.Ipc.sendToPanel('tabs.01','openRight')" style="text-decoration:underline">Sink :</h2>
	<p id="rightDisp">Undefined</p>
	<div class="flex-container" id="rightlist">
		<ul id="rightCheck">
		</ul>
		<ul id="rightPaths">
		</ul>
	</div>
	<button type="button" class="buttonBottom add" id="addAlibRight" onClick="Editor.Ipc.sendToPanel('tabs.01','addAlibRight')">New Acat</button>
	<button type="button" class="buttonBottom add" id="addSlibRight" onClick="Editor.Ipc.sendToPanel('tabs.01','addSlibRight')">New Scat</button>
	<button type="button" class="buttonBottom delete" id="deleteRight" onClick="Editor.Ipc.sendToPanel('tabs.01','deleteRight')">Delete</button>
	</div>
	</div>
  `,
  listeners: {
	
  },
  messages: {
    openLeft(){
		var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{
			properties: [ 'openDirectory'] });
		if(getPath){
			pathLeft=getPath[0];
			afficher();
		}
		else { 
			window.alert("Please select a folder");
		}
	},
	openRight(){
		var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{
			properties: [ 'openDirectory'] });
		if(getPath){
			pathRight=getPath[0];
			afficher();
		}
		else { 
			window.alert("Please select a folder");
		}
	},
	changeType(){
		var radioButtons=document.getElementById('tabs.01').shadowRoot.getElementById('selectType');
		if(radioButtons.children[0].checked){
			typeLib="all";
		}
		else if(radioButtons.children[1].checked){
			typeLib="scat";
		}
		else if(radioButtons.children[2].checked){
			typeLib="acat";
		}
		afficher();
	},
	addAlibLeft(){
		var addFile=getTextIfLib();
		if(addFile!=""){
			if(pathLeft){
				if(!fs.existsSync(path.join(pathLeft,addFile+".acat"))){
					fs.writeFileSync(path.join(pathLeft,addFile+".acat"),"{\"libArray\":[]}");
				}
				else{
					alert("This catalog already exists.");
				}
			}
			else  {
				alert("Please choose a path");
			}
		}
		else {
			alert("Please enter a valid file name");
		}
		afficher();
	},
	addSlibLeft(){
		var addFile=getTextIfLib();
		if(addFile!=""){
			if(pathLeft){
				if(!fs.existsSync(path.join(pathLeft,addFile+".scat"))){
					fs.writeFileSync(path.join(pathLeft,addFile+".scat"),"{\"libArray\":[]}");
				}
				else{
					alert("This catalog already exists.");
				}
			}
			else  {
				alert("Please choose a path");
			}
		}
		else {
			alert("Please enter a valid file name");
		}
		afficher();
	},
	addAlibRight(){
		var addFile=getTextIfLib();
		if(addFile!=""){
			if(pathRight){
				if(!fs.existsSync(path.join(pathRight,addFile+".acat"))){
					fs.writeFileSync(path.join(pathRight,addFile+".acat"),"{\"libArray\":[]}");
				}
				else{
					alert("This catalog already exists.");
				}
			}
			else  {
				alert("Please choose a path");
			}
		}
		else {
			alert("Please enter a valid file name");
		}
		afficher();
	},
	addSlibRight(){
		var addFile=getTextIfLib();
		if(addFile!=""){
			if(pathRight){
				if(!fs.existsSync(path.join(pathRight,addFile+".scat"))){
					fs.writeFileSync(path.join(pathRight,addFile+".scat"),"{\"libArray\":[]}");
				}
				else{
					alert("This catalog already exists.");
				}
			}
			else  {
				alert("Please choose a path");
			}
		}
		else {
			alert("Please enter a valid file name");
		}
		afficher();
	},
	deleteLeft(){
		
		for(var i=0; i<tableft.length;i++){
			if(document.getElementById('tabs.01').shadowRoot.getElementById('leftCheck').childNodes[i].firstChild.checked){
				try{
					fs.removeSync(path.join(pathLeft,tableft[i]));
				}
				catch(err) {//do nothing
					loggerActions.info("This catalog could not be deleted, please check its permissons : " + tableft[i]);
				}
			}
		}
		afficher();
	},
	deleteRight(){
		
		for(var i=0; i<tabright.length;i++){
			if(document.getElementById('tabs.01').shadowRoot.getElementById('rightCheck').childNodes[i].firstChild.checked){
				try{
					fs.removeSync(path.join(pathRight,tabright[i]));
				}
				catch(err) {//do nothing
					loggerActions.info("This catalog could not be deleted, please check its permissons : " + tabright[i]);
				}
			}
		}
		afficher();
	},
	moveLeft(){
		if(pathLeft!="" && pathRight!=""){
			for(var i=0; i<tabright.length;i++){
				if(document.getElementById('tabs.01').shadowRoot.getElementById('rightCheck').childNodes[i].firstChild.checked){
					if(!fs.existsSync(path.join(pathLeft,tabright[i]))){
						try{
							fs.copyFileSync(path.join(pathRight,tabright[i]),path.join(pathLeft,tabright[i]));
						}
						catch(err) {//do nothing
							loggerActions.info("This catalog could not moved, please check permissons : " + tabright[i]);
						}
					}
					else {
					loggerActions.info("This catalog could not moved, destination already present : " + path.join(pathLeft,tabright[i]));
					}
				}
				
			}
			refreshLeft();
		}
		else{
				alert("Please select the left and right folders.");
		}
	},
	moveRight(){
		if(pathLeft!="" && pathRight!=""){
			for(var i=0; i<tableft.length;i++){
				if(document.getElementById('tabs.01').shadowRoot.getElementById('leftCheck').childNodes[i].firstChild.checked){
					if(!fs.existsSync(path.join(pathRight,tableft[i]))){
						try{
							fs.copyFileSync(path.join(pathLeft,tableft[i]),path.join(pathRight,tableft[i]));
						}
						catch(err) {//do nothing
							loggerActions.info("This catalog could not moved, please check permissons : " + tableft[i]);
						}
					}
					else {
					loggerActions.info("This catalog could not moved, destination already present : " + path.join(pathRight,tableft[i]));
					}
				}
				
			}
			refreshRight();
		}
		else{
			alert("Please select the left and right folders.");
		}
	},
	concat(){
		var tabAdd= new Array();
		var ext="";
		try{
			for(var i=0; i<tableft.length;i++){// Getting all the entries and push them into tabAdd
				if(document.getElementById('tabs.01').shadowRoot.getElementById('leftCheck').childNodes[i].firstChild.checked){
					if(!ext){
						ext=common.getExt(tableft[i]);
					}
					if(ext==common.getExt(tableft[i])){
						var JsonLib = JSON.parse(fs.readFileSync(path.join(pathLeft,tableft[i]), 'utf8'));
						if (typeof(JsonLib["libArray"])!="undefined"){
							for(var y=0; y<JsonLib.libArray.length; y++){
								if(tabAdd.indexOf(JsonLib.libArray[y]) == -1){
									tabAdd.push(JsonLib.libArray[y]);
									
								}
							}
						}
					}
					else {
						alert("Please select only catalogs of the same type");
						throw "Different types of catalogs selected"; 
					}
				}
			}
			for(var i=0; i<tableft.length;i++){// Pushing tabadd into all destinations
				if(document.getElementById('tabs.01').shadowRoot.getElementById('rightCheck').childNodes[i].firstChild.checked){
					if(ext==common.getExt(tabright[i])){
						var JsonLib = JSON.parse(fs.readFileSync(path.join(pathRight,tabright[i]), 'utf8'));
						if (typeof(JsonLib["libArray"])!="undefined"){
							for(var y=0; y<tabAdd.length; y++){
								if(JsonLib["libArray"].indexOf(tabAdd[y]) == -1){
									JsonLib["libArray"].push(tabAdd[y]);
								}
							}
						}
					}
					else {
						alert("Please select only catalogs of the same type");
						throw "Different types of catalogs selected"; 
					}
					fs.writeFileSync(path.join(pathRight,tabright[i]), JSON.stringify(JsonLib) , 'utf-8');
				}
			}
		}
		catch(err){
			loggerActions.info(err);
			return;
		}
		loggerActions.info("tabadd : " + tabAdd);
	}
  },
});
