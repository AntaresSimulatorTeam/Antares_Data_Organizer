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
//Libraries and constants used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const electron = require('electron');
const remote = electron.remote;
const dialog= remote.dialog;
const app = remote.app;
global.rootRequire = function(name) {
	return require(app.getAppPath() + '/' + name);
}
const common = rootRequire('src/common.js');
const utils = rootRequire('src/utils.js');
const swal = require('sweetalert2');
var os;
var copyCmd;
if(process.platform=="win32"){
	os = rootRequire('src/windows.js');
	copyCmd="clip";
}
if(process.platform=="linux"){
	os = rootRequire('src/linux.js');
	copyCmd="";//does not work
}
const fs = require('fs-plus');
const fsUtils = require("nodejs-fs-utils");
const path = require('path');
const du = require('du');
const child_process = require('child_process');
const execSync = require('child_process').execSync;
const appPath= app.getAppPath();
const jsonTag= rootRequire('src/configTags.json');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Usefull declarations and global variables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var password=remote.getGlobal('sharedObj').password; 
var pathMain;
var loggerActions=remote.getGlobal('sharedObj').loggerActions; 
var args = remote.process.argv;
var styleTagDefined=false;

//Getting the arguments and checking if there is any instruction for this pannel
if(args.length>1){
	if(args[args.length-2]=="-s"){
		if(fs.existsSync(args[args.length-1])){
			pathMain=path.parse(args[args.length-1]).dir;
			swal({
			  title: 'PLEASE WAIT',
			  text: "Loading data about " + path.parse(args[args.length-1]).dir,
			  allowOutsideClick:  false
			})
			swal.showLoading();
			setTimeout(function() {//let time for the app to start
				display();
			},100);
		}
	}
	if(args[args.length-2]=="-a"){
		if(fs.existsSync(args[args.length-1])){
			pathMain=args[args.length-1];
			swal({
			  title: 'PLEASE WAIT',
			  text: "Loading data about " + args[args.length-1],
			  allowOutsideClick:  false
			})
			swal.showLoading();
			setTimeout(function() {
				display();
			},100);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//sets the archive properties from path
function getMetricsFromAntar(pathArchive){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathArchive +'" "*.para" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd).toString();
		var line = stringFile.match("\\[ExtrName\\].*" );
		var res=line[0].split("]")[1];
		if(res){
			document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML=res;
			if(copyCmd){
				document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').onclick=child_process.spawn(copyCmd).stdin.end(res);
			}
		}
		else document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML="Not found";
	}
	catch(err){
		document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML="Not found";
	}
	try{
		var line = stringFile.match("\\[OrigSLoc\\].*" );
		if(!line){
			line = stringFile.match("\\[OrigFLoc\\].*" );
		}
		var res=line[0].split("]")[1];
		if(res){
			document.getElementById('tabs.02').shadowRoot.getElementById('OrigSLoc').innerHTML=res;
			if(copyCmd){
				document.getElementById('tabs.02').shadowRoot.getElementById('OrigSLoc').onclick=child_process.spawn(copyCmd).stdin.end(res);
			}
		}
		else document.getElementById('tabs.02').shadowRoot.getElementById('OrigSLoc').innerHTML="Not found";
	}
	catch(err){
		document.getElementById('tabs.02').shadowRoot.getElementById('OrigSLoc').innerHTML="Not found";
	}
	try{
		var line = stringFile.match("\\[OrigSCat\\].*" );
		var res=line[0].split("]")[1];
		if(res){
			document.getElementById('tabs.02').shadowRoot.getElementById('OrigSCat').innerHTML=res;
			if(copyCmd){
				document.getElementById('tabs.02').shadowRoot.getElementById('OrigSCat').onclick=child_process.spawn(copyCmd).stdin.end(res);
			}
		}
	}
	catch(err){
		//do nothing
	}
}

//uses 7z to get size and number of files from an archive and displays them
function getArchiveProperties(pathArchive){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" l "'+pathArchive +'" -p' + password;
	try{
		var stringFile=execSync(cmd).toString();
		var lines=stringFile.trim().split('\n');
		if(lines.length>1){
			var lastline=lines[lines.length-1];
			document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedSize').innerHTML=common.formatBytes(parseInt(lastline.substring(25, lastline.length)),3);
			var tabParse=lastline.substring(52, lastline.length).split(",");
			if(tabParse.length==2){
				document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedFiles').innerHTML=parseInt(tabParse[0])+parseInt(tabParse[1]);
			}
		}
	}
	catch(err){
		document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedFiles').innerHTML="-";
	}
}

//get the size of a folder
function getFolderSizeSync(pathSize){
	try{
		var size = fsUtils.fsizeSync(pathSize);
		if(size){
			return common.formatBytes(size,3);
		}
		else return 0;
	}
	catch(err){
		loggerActions.debug("Error : " +err + " into getFolderSizeSync");
		return "Error";
	}
}

//uses 7z to get the name from study.antares
function getNameFromAntar(){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathMain +'" "*'+path.join(utils.getExtNameFromAntar(pathMain,password,loggerActions,0),"study.antares")+'" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);
		var line = stringFile.toString().match("caption.*" );
		var name=line[0].split("=")[1];
		if(name){
			return name;
		}
		else return "Not found";
	}
	catch(err){
		return "Error";
	}
}

//uses 7z to get the users notes xml
function getHtmlFromAntar(){
	try{
		
		var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathMain +'" "*'+ path.join(path.join(utils.getExtNameFromAntar(pathMain,password,loggerActions,0),"settings"),"comments.txt")+'" -r -so -p' + password;
		var stringFile=execSync(cmd);
		return utils.getHtmlFromXml(stringFile);
	}
	catch(err){
		return "Error";
	}
}

//get the global variables and use them to refresh the page
function display(){
	//Reset all the text zones
	document.getElementById('tabs.02').shadowRoot.getElementById('location').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('IntName').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('totalSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('inputSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('outputSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('userSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('inputFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('outputFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('totalFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('userFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('saved').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('version').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('notes').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('compressedSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('compressedFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedSize').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedFiles').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('StdHash').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('OrigSLoc').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('OrigSCat').innerHTML="-";
	document.getElementById('tabs.02').shadowRoot.getElementById('compressedFiles').innerHTML="-";
	for(var i =0;i<10;i++){
		document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).style.display="none";
	}
	//Setting the displays to visible or unvisible according to the type
	if(path.extname(pathMain)===".antpack"){
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').style.top="335px";
		document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').innerHTML=path.parse(pathMain).base;
		var studyMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyMetrics');
		for(var i=0;i<studyMetrics.length;i++){
			studyMetrics[i].style.display="none";
		}
		var archiveMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveMetrics');
		for(var i=0;i<archiveMetrics.length;i++){
			archiveMetrics[i].style.display="none";
		}
		var studyOrArchive=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrArchive');
		for(var i=0;i<studyOrArchive.length;i++){
			studyOrArchive[i].style.display="none";
		}
		var archiveOrAblob=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveOrAblob');
		for(var i=0;i<archiveOrAblob.length;i++){
			archiveOrAblob[i].style.display="";
		}
		var studyOrFolder=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrFolder');
		for(var i=0;i<studyOrFolder.length;i++){
			studyOrFolder[i].style.display="none";
		}
	}
	else if(path.extname(pathMain)===".antar"){
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').style.top="410px";
		document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').innerHTML=path.parse(pathMain).base;
		var studyMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyMetrics');
		for(var i=0;i<studyMetrics.length;i++){
			studyMetrics[i].style.display="none";
		}
		
		var archiveMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveMetrics');
		for(var i=0;i<archiveMetrics.length;i++){
			archiveMetrics[i].style.display="";
		}
		
		var studyOrArchive=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrArchive');
		for(var i=0;i<studyOrArchive.length;i++){
			studyOrArchive[i].style.display="";
		}
		var archiveOrAblob=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveOrAblob');
		for(var i=0;i<archiveOrAblob.length;i++){
			archiveOrAblob[i].style.display="";
		}
		var studyOrFolder=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrFolder');
		for(var i=0;i<studyOrFolder.length;i++){
			studyOrFolder[i].style.display="none";
		}
	}
	else if(utils.isChest(pathMain)){
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').style.top="215px";
		document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML=path.parse(pathMain).base;
		
		var studyMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyMetrics');
		for(var i=0;i<studyMetrics.length;i++){
			studyMetrics[i].style.display="none";
		}
		var archiveMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveMetrics');
		for(var i=0;i<archiveMetrics.length;i++){
			archiveMetrics[i].style.display="none";
		}
		var studyOrArchive=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrArchive');
		for(var i=0;i<studyOrArchive.length;i++){
			studyOrArchive[i].style.display="none";
		}
		var archiveOrAblob=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveOrAblob');
		for(var i=0;i<archiveOrAblob.length;i++){
			archiveOrAblob[i].style.display="none";
		}
		var studyOrFolder=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrFolder');
		for(var i=0;i<studyOrFolder.length;i++){
			studyOrFolder[i].style.display="";
		}
	}
	else{//study
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').style.top="390px";
		document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML=path.parse(pathMain).base;
		
		var studyMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyMetrics');
		for(var i=0;i<studyMetrics.length;i++){
			studyMetrics[i].style.display="";
		}
		var archiveMetrics=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveMetrics');
		for(var i=0;i<archiveMetrics.length;i++){
			archiveMetrics[i].style.display="none";
		}
		var studyOrArchive=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrArchive');
		for(var i=0;i<studyOrArchive.length;i++){
			studyOrArchive[i].style.display="";
		}
		var archiveOrAblob=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.archiveOrAblob');
		for(var i=0;i<archiveOrAblob.length;i++){
			archiveOrAblob[i].style.display="none";
		}
		var studyOrFolder=document.getElementById('tabs.02').shadowRoot.querySelectorAll('.studyOrFolder');
		for(var i=0;i<studyOrFolder.length;i++){
			studyOrFolder[i].style.display="";
		}
	}
	swal({
	  title: 'PLEASE WAIT',
	  text: "Loading data about " + pathMain,
	  allowOutsideClick:  false
	})
	swal.showLoading();
	setTimeout(function () {displayAll()},100);//letting time to refresh
}

// Load the properties of the document and displays them
function displayAll(){
	if(styleTagDefined==false && jsonTag && jsonTag.tags && jsonTag.tags.length>0){ //loading the tags options from json file if this function is called for the first time
		styleTagDefined=true;
		for(var i=0;i<jsonTag.tags.length;i++){
			if(jsonTag.tags[i].tagName){
				var style = document.createElement( 'style' );
				//A class cannot begin by a digit, so c+tag to allow for dates
				style.innerHTML = 'ul#TagList .'+"c"+jsonTag.tags[i].tagName + ':before { border-color:transparent ' +jsonTag.tags[i].tagColor+ ' transparent transparent; } ul#TagList .'+"c"+jsonTag.tags[i].tagName + ' { background-color:' +jsonTag.tags[i].tagColor+ '; }';
				document.getElementById('tabs.02').shadowRoot.appendChild(style);
				var opt = document.createElement('option');
				opt.value = jsonTag.tags[i].tagName;
				opt.innerHTML = jsonTag.tags[i].tagName;
				document.getElementById('tabs.02').shadowRoot.getElementById('selectTag').appendChild(opt);
			}
			else if(jsonTag.tags[i].groupName){
					var group = document.createElement('option');
					group.value = jsonTag.tags[i].groupName;
					group.innerHTML = jsonTag.tags[i].groupName;
					group.disabled=true;
					document.getElementById('tabs.02').shadowRoot.getElementById('selectTag').appendChild(group);
			}
		}
		
	}

	var loc=path.parse(pathMain).dir;
	if(loc.length>80){
		loc=loc.substring(0,80)+"...";
	}
	document.getElementById('tabs.02').shadowRoot.getElementById('location').innerHTML=loc;
	document.getElementById('tabs.02').shadowRoot.getElementById('location').title=path.parse(pathMain).dir;
	if(copyCmd){
		document.getElementById('tabs.02').shadowRoot.getElementById('location').onclick=child_process.spawn(copyCmd).stdin.end(path.parse(pathMain).dir);
	}
	if(path.extname(pathMain)===".antpack"){
		document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').innerHTML=path.parse(pathMain).base;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').onclick=child_process.spawn(copyCmd).stdin.end(path.parse(pathMain).base);
		}
		var getName=getNameFromAntar();
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('IntName').onclick=child_process.spawn(copyCmd).stdin.end(getName);
		}
		document.getElementById('tabs.02').shadowRoot.getElementById('saved').innerHTML=utils.toJSONLocal(fs.statSync(pathMain).mtime);
		document.getElementById('tabs.02').shadowRoot.getElementById('StdHash').innerHTML=utils.getHashFromAntar(pathMain,password,loggerActions,0);
		var closeCross = document.getElementById('tabs.02').shadowRoot.getElementById("TagList").getElementsByClassName("blackCross");
		document.getElementById('tabs.02').shadowRoot.getElementById('compressedSize').innerHTML=common.formatBytes(fs.getSizeSync(pathMain),3);
		document.getElementById('tabs.02').shadowRoot.getElementById('compressedFiles').innerHTML="1";
		document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedSize').innerHTML=common.formatBytes(utils.getMetaFromAntar(pathMain,'TotlSize',password,loggerActions,0),3);
		document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedFiles').innerHTML=utils.getMetaFromAntar(pathMain,'TotlFile',password,loggerActions,0);
		getMetricsFromAntar(pathMain);
		var htmlFromAntar=getHtmlFromAntar();
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').innerHTML=utils.getLinesFromAblob(pathMain,loggerActions,password);
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('notes').onclick=child_process.spawn(copyCmd).stdin.end(utils.getLinesFromAblob(pathMain,loggerActions,password));
		}
	}
	else if(path.extname(pathMain)===".antar"){
		document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').innerHTML=path.parse(pathMain).base;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('ArchName').onclick=child_process.spawn(copyCmd).stdin.end(path.parse(pathMain).base);
		}
		var getName=getNameFromAntar();
		document.getElementById('tabs.02').shadowRoot.getElementById('IntName').innerHTML=getName;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('IntName').onclick=child_process.spawn(copyCmd).stdin.end(getName);
		}
		document.getElementById('tabs.02').shadowRoot.getElementById('saved').innerHTML=utils.toJSONLocal(fs.statSync(pathMain).mtime);
		var tags=utils.getTagsFromAntar(pathMain,password,loggerActions,0);
		for(var i=0;i<tags.length;i++){
			document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)+"_txt").innerHTML=tags[i];
			document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).style.display="";
			document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).className="c"+tags[i];
		}
		var closeCross = document.getElementById('tabs.02').shadowRoot.getElementById("TagList").getElementsByClassName("blackCross");
		for(var i=0;i<closeCross.length;i++){
			closeCross[i].style.display="none";
		}
		document.getElementById('tabs.02').shadowRoot.getElementById('compressedSize').innerHTML=common.formatBytes(fs.getSizeSync(pathMain),3);
		document.getElementById('tabs.02').shadowRoot.getElementById('compressedFiles').innerHTML="1";
		document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedSize').innerHTML=common.formatBytes(utils.getMetaFromAntar(pathMain,'TotlSize',password,loggerActions,0),3);
		document.getElementById('tabs.02').shadowRoot.getElementById('uncompressedFiles').innerHTML=utils.getMetaFromAntar(pathMain,'TotlFile',password,loggerActions,0);
		document.getElementById('tabs.02').shadowRoot.getElementById('StdHash').innerHTML=utils.getHashFromAntar(pathMain,password,loggerActions,0);
		getMetricsFromAntar(pathMain);
		var htmlFromAntar=getHtmlFromAntar();
		document.getElementById('tabs.02').shadowRoot.getElementById('notes').innerHTML=htmlFromAntar;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('notes').onclick=child_process.spawn(copyCmd).stdin.end(htmlFromAntar);
		}
		document.getElementById('tabs.02').shadowRoot.getElementById('version').innerHTML=utils.readVersionAntar(pathMain,password,loggerActions,0);
	}
	else if(utils.isChest(pathMain)){
		document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML=path.parse(pathMain).base;

		document.getElementById('tabs.02').shadowRoot.getElementById('totalSize').innerHTML=getFolderSizeSync(pathMain);
		document.getElementById('tabs.02').shadowRoot.getElementById('saved').innerHTML=utils.toJSONLocal(fs.statSync(pathMain).mtime);
		document.getElementById('tabs.02').shadowRoot.getElementById('totalFiles').innerHTML=fs.listTreeSync(pathMain).length;
		var info=path.join(pathMain,"info.ado");
		if(fs.existsSync(info)){
			document.getElementById('tabs.02').shadowRoot.getElementById('notes').innerHTML=fs.readFileSync(info, 'utf8');
		}
	}
	else{//study
		document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').innerHTML=path.parse(pathMain).base;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('ExtName').onclick=child_process.spawn(copyCmd).stdin.end(path.parse(pathMain).base);
		}
		var readN=readName(pathMain);
		document.getElementById('tabs.02').shadowRoot.getElementById('IntName').innerHTML=readN;
		if(copyCmd){
			document.getElementById('tabs.02').shadowRoot.getElementById('IntName').onclick=child_process.spawn(copyCmd).stdin.end(readN);
		}

		if(fs.existsSync(pathMain) && fs.statSync(pathMain).isDirectory()){
			document.getElementById('tabs.02').shadowRoot.getElementById('totalSize').innerHTML=getFolderSizeSync(pathMain);
			document.getElementById('tabs.02').shadowRoot.getElementById('saved').innerHTML=readModifDate(pathMain);
			var tags=utils.readTag(pathMain,loggerActions);
			for(var i=0;i<tags.length;i++){
				document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)+"_txt").innerHTML=tags[i];
				document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).style.display="";
				document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).className="c"+tags[i];
			}
			var closeCross = document.getElementById('tabs.02').shadowRoot.getElementById("TagList").getElementsByClassName("blackCross");
			for(var i=0;i<closeCross.length;i++){
				closeCross[i].style.display="";
			}
			document.getElementById('tabs.02').shadowRoot.getElementById('version').innerHTML=utils.readVersion(pathMain);
			document.getElementById('tabs.02').shadowRoot.getElementById('totalFiles').innerHTML=fs.listTreeSync(pathMain).length;
			var pathInput=path.join(pathMain,"input");
			var pathOutput=path.join(pathMain,"output");
			var pathUser=path.join(pathMain,"user");
			
			if(fs.existsSync(pathInput) && fs.statSync(pathInput).isDirectory()){
				document.getElementById('tabs.02').shadowRoot.getElementById('inputSize').innerHTML=getFolderSizeSync(pathInput);
				document.getElementById('tabs.02').shadowRoot.getElementById('inputFiles').innerHTML=fs.listTreeSync(pathInput).length;
			}
			if(fs.existsSync(pathOutput) && fs.statSync(pathOutput).isDirectory()){
				document.getElementById('tabs.02').shadowRoot.getElementById('outputSize').innerHTML=getFolderSizeSync(pathOutput);
				document.getElementById('tabs.02').shadowRoot.getElementById('outputFiles').innerHTML=fs.listTreeSync(pathOutput).length;
			}
			if(fs.existsSync(pathUser) && fs.statSync(pathUser).isDirectory()){
				document.getElementById('tabs.02').shadowRoot.getElementById('userSize').innerHTML=getFolderSizeSync(pathUser);
				document.getElementById('tabs.02').shadowRoot.getElementById('userFiles').innerHTML=fs.listTreeSync(pathUser).length;
			}
			var commentsPath=path.join(path.join(pathMain,"settings"),"comments.txt");
			if(fs.existsSync(commentsPath)){
				document.getElementById('tabs.02').shadowRoot.getElementById('notes').innerHTML=utils.getHtmlFromXmlFile(commentsPath);
			}
		}
	}
	swal.close();
}

//Reads date from study/sudy.antares and returns it a a string YYY-MM-DD or "Not found" if not found
function readModifDate(pathStudy){
	try{
		var fileContent = fs.readFileSync(path.join(pathStudy,"study.antares"), 'utf8');
		var line = fileContent.match("lastsave.{0,3}[0-9]*" );
		var timestamp=line[0].match("[0-9]{1,}")[0];
		if(timestamp){
			var date = new Date(timestamp*1000);
			return utils.toJSONLocal(date);
		}
		else return "Not found";
	}
	catch(err){
		return "Error";
	}
}

//Reads name from study/sudy.antares and returns it a a string or "Not found" if not found
function readName(pathStudy){
	try{
		var fileContent = fs.readFileSync(path.join(pathStudy,"study.antares"), 'utf8');
		var line = fileContent.match("caption.*" );
		var name=line[0].split("=")[1];
		if(name){
			return name;
		}
		else return "Not found";
	}
	catch(err){
		return "Error";
	}
}

//Deletes a tag from study.antares and refresh tags
function deleteTag(tag_index){
	var tags=utils.readTag(pathMain,loggerActions);
	if(tags.length>=tag_index){
		if(tag_index!=-1)
		{
			tags.splice(tag_index-1,1);
		}
		try{
			var fileContent = fs.readFileSync(path.join(pathMain,"study.antares"), 'utf8');
			const allLines = fileContent.split(/\r\n|\n/);
			var modif="";
			for(var i=0;i<allLines.length;i++){
				if(!allLines[i].startsWith("tag_") && allLines[i]!=""){
					modif+=allLines[i]+"\r\n";
				}
			}
			for(var i=0;i<tags.length;i++){
				modif+="tag_"+("0" + (i+1)).slice(-2)+" = "+ tags[i]+"\r\n";
			}
			fs.writeFileSync(path.join(pathMain,"study.antares"),modif,'utf8');
			refreshTags();
		}
		catch(err){
			loggerActions.debug(err);
			dialog.showErrorBox("Error", "There was a problem while saving tag changes.");
		}
		
	}
	else{
		dialog.showErrorBox("Error", "Wrong tag id.");//Should not happen unless the file is modified by more than one user at a time
	}
}

//Refresh only the tags
function refreshTags(){
	for(var i =0;i<10;i++){
		document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).style.display="none";
	}
	var tags=utils.readTag(pathMain,loggerActions);
	for(var i=0;i<tags.length;i++){
		document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)+"_txt").innerHTML=tags[i];
		document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).style.display="";
		document.getElementById('tabs.02').shadowRoot.getElementById('tag_'+("0" + (i+1)).slice(-2)).className="c"+tags[i];
	}
	Editor.Ipc.sendToPanel('tabs.03','refreshTag');
}

//Adds a tag
function addTag(){
	if(pathMain!="" && styleTagDefined){
		deleteTag(-1);//clean up
		var tagToAdd=document.getElementById('tabs.02').shadowRoot.getElementById('selectTag').value;
		var tags=utils.readTag(pathMain,loggerActions);
		if(tags.length>9){
			dialog.showErrorBox("Error", "Maximum number of tags reached");
			return;
		}
		for(var i=0;i<tags.length;i++){
			if(tags[i]==tagToAdd){
				dialog.showErrorBox("Error", "This tag is already selected");
				return;
			}
		}
		var fileContent = fs.readFileSync(path.join(pathMain,"study.antares"), 'utf8');
		var line = fileContent.match('tag_'+(("0" + tags.length+1).slice(-2))+".*");
		fileContent+='tag_'+(("0" + (tags.length+1)).slice(-2))+" = " +tagToAdd+"\r\n";
		try{
			fs.writeFileSync(path.join(pathMain,"study.antares"),fileContent,'utf8');
		}
		catch(err){
				loggerActions.debug(err);
				dialog.showErrorBox("Error", "Error while writing study.antares");
		}
		refreshTags();
	}
}


Editor.Panel.extend({
  style: `
    h1 {
      color: #09f;
    }
	table, th, td {
		text-align:center;
		min-width: 50px;
	}
	table{
		margin-top:10px;
		margin-bottom:10px;
	}
	.leftColumn{
		text-align:left;
	}
	#notes{
		color:black;
		background-color:white;
		overflow-x:auto; 
		overflow-y:visible; 
		height:auto;
		width:95%;
		position:absolute;
		left:3px;
		right:15px;
		top: 390px;
		bottom: 0;
		margin-top: 0px;
		margin-right:5px;
		bottom:5px;
		padding-left: 5px;
		white-space: pre-wrap;
	}
	#tagCont{
		height:18px;
	}
	ul#TagList {
		padding-left:0px; 
		text-align:center;
		margin: 0px;
		height:18px;
	}
	ul#TagList li{
		display: inline-block;
		top:0px;
		background-color:red;
		margin-right: 5px;
		margin-left: 5px;
		height:18px;
		padding-right:10px;
	}
	ul#TagList li:before { 
		content:"";
		float:left;
		position:relative;
		top:0;
		left:-9px;
		width:0;
		height:0;
		border-color:transparent red transparent transparent;
		border-style:solid;
		border-width:9px 9px 9px 0;	
	}
	ul#TagList li:after{
		content:"";
		position:relative;
		top:6px;
		left:-7;
		float:left;
		width:6px;
		height:6px;
		border-radius:3px;
		background:#474747;
	}
	.blackCross{
		cursor: pointer;
		right:-5px;
	}
	ul#TagList span{
		position:relative;
		top:-2px;
		color:black;
	}
	select option:disabled {
		color: red;
		font-weight: bold;
	}
  `,

  template: `
	<style> @import "./general.css"; </style>
    <div id="identification">
		<table>
			<tr> <th colspan="2" style="text-align:left;"> I - Identification </th> </tr>
			<tr class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Archive file name : </td> <td id="ArchName"> - </td></tr>
			<tr class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Orginal location : </td> <td id="OrigSLoc"> - </td> </tr>
			<tr class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Original study catalog : </td> <td id="OrigSCat"> - </td> </tr>
			<tr> <td class="leftColumn"> External Name : </td> <td id="ExtName"> - </td> </tr>
			<tr class="studyOrArchive"> <td class="leftColumn"> Internal Name : </td> <td id="IntName"> - </td> </tr>
			<tr> <td class="leftColumn"> Location : </td> <td id="location"> - </td></tr>
			<tr class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Hash (expanded) : </td> <td id="StdHash"> - </td> </tr>
			<tr class="studyOrArchive"> <td class="leftColumn"> Version : </td> <td id="version"> - </td></tr>
			<tr> <td class="leftColumn"> Last Saved : </td> <td id="saved"> - </td></tr>
			<tr class="studyOrArchive"> <td class="leftColumn"> Tags : </td> 
			<td><ul id=TagList>
			<li style="display:none;" id="tag_01"> <span id="tag_01_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_01')">×</span></li>
			<li style="display:none;" id="tag_02"> <span id="tag_02_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_02')">×</span></li>
			<li style="display:none;" id="tag_03"> <span id="tag_03_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_03')">×</span></li>
			<li style="display:none;" id="tag_04"> <span id="tag_04_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_04')">×</span></li>
			<li style="display:none;" id="tag_05"> <span id="tag_05_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_05')">×</span></li>
			<li style="display:none;" id="tag_06"> <span id="tag_06_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_06')">×</span></li>
			<li style="display:none;" id="tag_07"> <span id="tag_07_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_07')">×</span></li>
			<li style="display:none;" id="tag_08"> <span id="tag_08_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_08')">×</span></li>
			<li style="display:none;" id="tag_09"> <span id="tag_09_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_09')">×</span></li>
			<li style="display:none;" id="tag_10"> <span id="tag_10_txt"> - </span> <span class="blackCross" onClick="Editor.Ipc.sendToPanel('tabs.02','del_10')">×</span></li>
			</ul></td>
			<tr class="studyMetrics"><td class="leftColumn">Add tag :</td><td class="leftColumn"> <SELECT id="selectTag"></SELECT>  <button type="button" id="buttonAdd" onClick="Editor.Ipc.sendToPanel('tabs.02','addTag')">Add</button> </td></tr>
		</tr>
		</table><\div>
	<div id="metrics">
		<table>
			<tr> <th class="leftColumn"> II - Metrics </th> <td> Size </td> <td> Files </td> </tr>
			<tr class="studyMetrics"> <td class="leftColumn"> Input : </td> <td id="inputSize"> - </td> <td id="inputFiles"> - </td></tr>
			<tr class="studyMetrics"> <td class="leftColumn"> Output : </td> <td id="outputSize"> - </td> <td id="outputFiles"> - </td></tr>
			<tr class="studyMetrics"> <td class="leftColumn"> User : </td> <td id="userSize"> - </td> <td id="userFiles"> - </td></tr>
			<tr class="studyOrFolder"> <td class="leftColumn"> Total : </td> <td id="totalSize"> - </td> <td id="totalFiles"> - </td></tr>
			<tr  class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Compressed : </td> <td id="compressedSize"> - </td> <td id="compressedFiles"> - </td></tr>
			<tr  class="archiveOrAblob" style="display:none;"> <td class="leftColumn"> Uncompressed : </td> <td id="uncompressedSize"> - </td> <td id="uncompressedFiles"> - </td></tr>
		</table><\div>
	<div id="usersNotes">
		<table>
			<tr> <th> III - User's notes </th></tr>
			<tr> <td class="leftColumn"><div id="notes"><\div></td></tr>
		</table>
	<\div>
	
  `,

  listeners: {
  },
  messages: {
	receivePath(){
		pathMain=remote.getGlobal('sharedObj').globalPath;
		display();
	},
	del_01(){
		deleteTag(1);
	},
	del_02(){
		deleteTag(2);
	},
	del_03(){
		deleteTag(3);
	},
	del_04(){
		deleteTag(4);
	},
	del_05(){
		deleteTag(5);
	},
	del_06(){
		deleteTag(6);
	},
	del_07(){
		deleteTag(7);
	},
	del_08(){
		deleteTag(8);
	},
	del_09(){
		deleteTag(9);
	},
	del_10(){
		deleteTag(10);
	},
	addTag(){
		addTag();
	}
  },
});
