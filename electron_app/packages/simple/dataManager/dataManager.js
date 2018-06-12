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
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Usefull declarations and global variables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const appPath= app.getAppPath();
var pathMain=""; // Path to scat, acat or portfolio to be opened
var destFolder=""; //path to the destination folder
var destScat=""; //path to the destination study catalog
var destAcat=""; //path to the destination archive catalog
var destAcatSave="";
var destScatSave="";
var destFolderSave="";
var styleTagDefined=false;//Json tag descriptor already loaded or not
var jsonTabFolder;// a Json structure containing the archives and studies contained in the portfolio or catalogs
var jsonTabFolderSave;// a Json structure containing the archives and studies contained in the portfolio or catalogs
var JsonLib;
var arrayUnregister=[];//An array used to store the indices of the elements to unregister from a lib
//Indices of the corresponding instruction in twoDimsArray
var SHOW=0;
var REGISTER=1;
var UNREGISTER=2;
var TRIM=3;
var COPY=4;
var ARCHIVE=5;
var EXPAND=6;
var DELETE=7;
var cancelAll=0; // Set to one to stop execution
var logPath=remote.getGlobal('sharedObj').logPath;
var logExecPath;
var nbTasks=0;   
var nbTasksOk=0;
var showFile="";
var notDone=0;
var nbShadowTasks=0; //Tasks that are not directly defined by the user but are implicit to other tasks
var nbErrorMain=0;
var upDown="up";//Defines the jsonTabFolder sorting direction
var tagSelected="";
var dispType="all";// sf for study and folders or aa for antpack and archives
var researchDepth=10;
var loggerActions=remote.getGlobal('sharedObj').loggerActions; 
var password=remote.getGlobal('sharedObj').password; 
var appLevel=remote.getGlobal('sharedObj').appLevel; 
var loggerExec;
var args = remote.process.argv;
const archiveOptSpeed=" -mx1 -t7z -mhe ";
const archiveOptSize=" -mx9 -t7z -mhe -mmt=on ";
var archiveOpt=archiveOptSpeed;

//Getting the arguments and checking if there is any instruction for this pannel
if(args.length>1){
	if(args[args.length-2]=="-p"){
		if(fs.existsSync(args[args.length-1])){
			pathMain=args[args.length-1];
			setTimeout(function() {
				afficher();
				Editor.Panel.focus('simple.03');
			},100);
		}
	}
	if(args[args.length-2]=="-c"){
		if(isValidLib(args[args.length-1])){
			pathMain=args[args.length-1];
			setTimeout(function() {
				afficher();
				Editor.Panel.focus('simple.03');
			},100);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Execute main functions 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// create a loop function
function loopExec (i,itabValidIndices, execFunc,twoDimsArray,tabValidIndices) { 
	execFunc(i,itabValidIndices,twoDimsArray,tabValidIndices);//Launch asynchronous function
	var ytabValidIndices=itabValidIndices+1;
	var realIndice=tabValidIndices[ytabValidIndices]; 
	
	if(cancelAll){
		loggerExec.info("Execution canceled");
		afficher("sync");
		enableMain();
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.textContent= "EXECUTION CANCELED : NOT ALL TASKS FINISHED";
		infoText.style.color="firebrick";
	}
	else if (ytabValidIndices< tabValidIndices.length) {   //  if the counter < imax, call the loop function
		setTimeout(function () {    //  call a 0.1s setTimeout when the loop is called
			loopExec(realIndice,ytabValidIndices, execFunc,twoDimsArray,tabValidIndices);             //  ..  again which will trigger another call
		}, 100);
	}
	
}

//wait for exec and display waiting time
function waitExec(minutes,seconds,execFunc){
	if(minutes<=0 && seconds<=1 && !cancelAll){
		execFunc();
		
	}
	else if(!cancelAll){
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.onclick="";
		infoText.textContent= "PLEASE WAIT " +(minutes+1) + " minutes before execution";//for 59min50s, displays 60 min, for 0min 10s displays 1 min
		infoText.style.color="orange";
		if(seconds>0){
			setTimeout(function() {waitExec(minutes,seconds-1,execFunc);},1000);
		}
		else{
			setTimeout(function() {waitExec(minutes-1,59,execFunc);},1000);
		}
	}
	else{
		loggerActions.info("Execution canceled");
		refreshBoxes();
		razTotalLine();
		enableMain();
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.textContent= "Execution canceled before start time";
		infoText.style.color="lightgreen";
	}
}

//Execute actions for an open scat file
function execScat(){
	var showList=document.getElementById('simple.03').shadowRoot.getElementById('Show');
	var registerList=document.getElementById('simple.03').shadowRoot.getElementById('Register');
	var unregisterList=document.getElementById('simple.03').shadowRoot.getElementById('Unregister');
	var trimList=document.getElementById('simple.03').shadowRoot.getElementById('Trim');
	var copyList=document.getElementById('simple.03').shadowRoot.getElementById('Copy');
	var archiveList=document.getElementById('simple.03').shadowRoot.getElementById('Archive');
	var deleteList=document.getElementById('simple.03').shadowRoot.getElementById('Delete');
	var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
	arrayUnregister=[];//Reset in case it has already been used
	var sizeBeginning=jsonTabFolder.TypePath.length;//the array may be expanded during the loop,but not the lists
	var twoDimsArray=utils.zeros([8,sizeBeginning]);
	nbTasks=0;
	nbTasksOk=0;
	notDone=0;
	nbShadowTasks=0;
	nbErrorMain=0;
	showFile="";
	for(var i=0; i<sizeBeginning; i++){
		if(showList.childNodes[i].firstChild.checked){
			twoDimsArray[SHOW][i]=1;
			nbTasks++;
			if(showFile==""){
				try{
					var tzoffset = (new Date()).getTimezoneOffset() * 60000;
					showFile=path.join(path.parse(logPath).dir,"show_"+(new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,''))+"_"+path.parse(pathMain).name+".txt");
				}
				catch (err){
					loggerExec.debug("Error : " +err + " inside execScat");
					loggerExec.error("Creating showfile failed");
				}
			}
		}
		if(registerList.childNodes[i].firstChild.checked){
			twoDimsArray[REGISTER][i]=1;
			nbTasks++;
		}
		if(trimList.childNodes[i].firstChild.checked){
			twoDimsArray[TRIM][i]=1;
			nbTasks++;
		}
		if(copyList.childNodes[i].firstChild.checked){
			twoDimsArray[COPY][i]=1;
			nbTasks++;
		}
		if(archiveList.childNodes[i].firstChild.checked){
			twoDimsArray[ARCHIVE][i]=1;
			nbTasks++;
		}
		if(deleteList.childNodes[i].firstChild.checked){
			twoDimsArray[DELETE][i]=1;
			nbTasks++;
		}
		if(unregisterList.childNodes[i].firstChild.checked){
			twoDimsArray[UNREGISTER][i]=1;
			nbTasks++;
		}
	}
	
	var tabValidIndices=tabExec(twoDimsArray,jsonTabFolder.TypePath.length);// index of all the non zeros lines
	if(tabValidIndices.length>0){
		createLoggerExec();
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[0]].path + ")" ;
		infoText.onclick="";
		infoText.style.color="orange";
	
		setTimeout(function () {
			loopExec(tabValidIndices[0],0, internalExecScat,twoDimsArray,tabValidIndices);
		}
	,100);
	}
	else{
		enableMain();
		infoText.textContent= "No operations selected, execution finished." ;
		infoText.style.color="lightgreen";
	}
}

//Execute actions for an open acat file
function execAcat(){
	var showList=document.getElementById('simple.03').shadowRoot.getElementById('Show');
	var registerList=document.getElementById('simple.03').shadowRoot.getElementById('Register');
	var unregisterList=document.getElementById('simple.03').shadowRoot.getElementById('Unregister');
	var copyList=document.getElementById('simple.03').shadowRoot.getElementById('Copy');
	var expandList=document.getElementById('simple.03').shadowRoot.getElementById('Expand');
	var deleteList=document.getElementById('simple.03').shadowRoot.getElementById('Delete');
	
	arrayUnregister=[];
	var sizeBeginning=jsonTabFolder.TypePath.length;//the array may be expanded during the loop,but not the lists
	var twoDimsArray=utils.zeros([8,sizeBeginning]);
	nbTasks=0;
	nbTasksOk=0;
	notDone=0;
	nbShadowTasks=0;
	nbErrorMain=0;
	showFile="";
	var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
	for(var i=0; i<sizeBeginning; i++){//Complete the array with indices of valid operations
		if(showList.childNodes[i].firstChild.checked){
			twoDimsArray[SHOW][i]=1;
			nbTasks++;
			if(showFile==""){
				try{
					showFile=path.join(path.parse(logPath).dir,"show_"+(new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,''))+"_"+path.parse(pathMain).name+".txt");
				}
				catch (err){
					loggerExec.debug("Error : " +err + " inside execAcat");
					loggerExec.error("Creating showfile failed");
				}
			}
		}
		if(registerList.childNodes[i].firstChild.checked){
			twoDimsArray[REGISTER][i]=1;
			nbTasks++;
		}
		if(copyList.childNodes[i].firstChild.checked){
			twoDimsArray[COPY][i]=1;
			nbTasks++;
		}
		if(expandList.childNodes[i].firstChild.checked){
			twoDimsArray[EXPAND][i]=1;
			nbTasks++;
		}
		if(deleteList.childNodes[i].firstChild.checked){
			twoDimsArray[DELETE][i]=1;
			nbTasks++;
		}
		if(unregisterList.childNodes[i].firstChild.checked){
			twoDimsArray[UNREGISTER][i]=1;
			nbTasks++;
		}
	}
	var tabValidIndices=tabExec(twoDimsArray,jsonTabFolder.TypePath.length);


	if(tabValidIndices.length>0){
		createLoggerExec();
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[0]].path +")";
		infoText.style.color="orange";
		infoText.onclick="";
		setTimeout(function () {
		loopExec(tabValidIndices[0],0, internalExecAcat,twoDimsArray,tabValidIndices);
		}
	,100);
	}
	else{
		enableMain();
		infoText.textContent= "No operations selected, execution finished." ;
		infoText.style.color="lightgreen";
	}
}

//Execute actions for an open folder
function execFolder(){
	var showList=document.getElementById('simple.03').shadowRoot.getElementById('Show');
	var registerList=document.getElementById('simple.03').shadowRoot.getElementById('Register');
	var trimList=document.getElementById('simple.03').shadowRoot.getElementById('Trim');
	var copyList=document.getElementById('simple.03').shadowRoot.getElementById('Copy');
	var archiveList=document.getElementById('simple.03').shadowRoot.getElementById('Archive');
	var expandList=document.getElementById('simple.03').shadowRoot.getElementById('Expand');
	var deleteList=document.getElementById('simple.03').shadowRoot.getElementById('Delete');
	var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
	
	var twoDimsArray=utils.zeros([8,jsonTabFolder.TypePath.length]);
	nbTasks=0;
	nbTasksOk=0;
	notDone=0;
	nbShadowTasks=0;
	nbErrorMain=0;
	showFile="";
	for(var i=0; i<jsonTabFolder.TypePath.length; i++){//Complete the array with indices of valid operations
		if(showList.childNodes[i].firstChild.checked){
			twoDimsArray[SHOW][i]=1;
			nbTasks++;
			if(showFile==""){
				try{
					var tzoffset = (new Date()).getTimezoneOffset() * 60000;
					showFile=path.join(path.parse(logPath).dir,"show_"+(new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,''))+"_"+path.parse(pathMain).name+".txt");

				}
				catch (err){
					loggerExec.debug("Error : " +err + " inside execFolder");
					loggerExec.error("Creating showfile failed");
				}
			}
		}
		if(trimList.childNodes[i].firstChild.checked && jsonTabFolder.TypePath[i].type=="study"){
			twoDimsArray[TRIM][i]=1;
			nbTasks++;
		}
		if(registerList.childNodes[i].firstChild.checked){
			twoDimsArray[REGISTER][i]=1;
			nbTasks++;
		}
		if(copyList.childNodes[i].firstChild.checked){
			twoDimsArray[COPY][i]=1;
			nbTasks++;
		}
		if(archiveList.childNodes[i].firstChild.checked && (jsonTabFolder.TypePath[i].type=="study" || jsonTabFolder.TypePath[i].type=="chest") ){
			twoDimsArray[ARCHIVE][i]=1;
			nbTasks++;
		}
		if(expandList.childNodes[i].firstChild.checked && (jsonTabFolder.TypePath[i].type=="archive" || jsonTabFolder.TypePath[i].type=="pack")){
			twoDimsArray[EXPAND][i]=1;
			nbTasks++;
		}
		if(deleteList.childNodes[i].firstChild.checked){
			twoDimsArray[DELETE][i]=1;
			nbTasks++;
		}
	}
	var tabValidIndices=tabExec(twoDimsArray,jsonTabFolder.TypePath.length);

	if(tabValidIndices.length>0){
		createLoggerExec();
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[0]].path +")";
		infoText.onclick="";
		infoText.style.color="orange";
		setTimeout(function () {
		loopExec(tabValidIndices[0],0, internalExecFolder,twoDimsArray,tabValidIndices);
		}
	,100);
	}
	else{
		enableMain();
		infoText.textContent= "No operations selected, execution finished." ;
		infoText.style.color="lightgreen";
	}
}

//Internal loop of the execAcat function
function internalExecAcat(indice, itabValidIndices,twoDimsArray,tabValidIndices){
	loggerExec.info("Beginning operations on " +jsonTabFolder.TypePath[indice].path +":");
	var disableDelete=0;
	arrayUnregister[indice]=0;
	var unreg=false;
	var nbError=0;
	if(twoDimsArray[SHOW][indice]){
		loggerExec.verbose("\r\nShowing :" );
		if(jsonTabFolder.TypePath[indice].type=="pack"){
			nbError+=addShowAblob(jsonTabFolder.TypePath[indice].path);
		}
		else{
			nbError+=addShowArchive(jsonTabFolder.TypePath[indice].path);
		}
	}
	if(twoDimsArray[REGISTER][indice]){
		loggerExec.verbose("\r\nRegistering :" );
		nbError+=registerInLib(jsonTabFolder.TypePath[indice].path,destAcat);
	}
	if(twoDimsArray[COPY][indice]){
		loggerExec.verbose("\r\nCopying :" );
		var ret=copyStudy(jsonTabFolder.TypePath[indice].path,"archive");
		nbError+=ret;
		disableDelete+=ret;
	}
	if(twoDimsArray[EXPAND][indice]){
		loggerExec.verbose("\r\nExpanding :" );
		var ret=expandStudy(jsonTabFolder.TypePath[indice].path);
		nbError+=ret;
		disableDelete+=ret;
	}
	if(twoDimsArray[DELETE][indice]){
		loggerExec.verbose("\r\nDeleting :" );
		if(disableDelete){
			notDone++;
			loggerExec.info(jsonTabFolder.TypePath[indice].path+" has not been deleted because of a problem during an earlier step");
		}
		else{
			nbError+=deleteStudy(jsonTabFolder.TypePath[indice].path);
			if(arrayUnregister[indice]==0){
				arrayUnregister[indice]=1;
				nbShadowTasks++;
				unreg=true;
			}
		}
	}
	if(twoDimsArray[UNREGISTER][indice]){
		arrayUnregister[indice]=1;
		unreg=true;
	}
	if(nbError){
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path +", " + nbError +" errors\r\n\r\n");
	}
	else{
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path+"\r\n\r\n");
	}
	if(itabValidIndices<tabValidIndices.length-1){
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[itabValidIndices+1]].path + ")" ;
		infoText.onclick="";
		infoText.style.color="orange";
	}
	else{
		if(unreg){
			loggerExec.verbose("\r\nUnregistering :" );
			unregister(arrayUnregister);
		}
		loggerExec.info("End of execution : "+ nbTasksOk + " tasks completed, " +nbTasks+ " tasks requested, "+ nbShadowTasks +" implicit tasks : " + nbErrorMain +" errors.\r\n\r\n");
		loggerExec.close();
		afficher("sync");
		enableMain();
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		if(nbErrorMain){
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : " + nbErrorMain +". Please check the log at " + logExecPath;
			infoText.style.color="firebrick";
		}
		else{
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : 0. Please check the log at " + logExecPath;
			infoText.style.color="lightgreen";
		}

		infoText.onclick=(function(){
			if(fs.existsSync(logExecPath)){
				shell.openItem(logExecPath);
			}
			else alert("No log file found");
		});
	}
}

//Internal loop of the execScat function,takes one study and does all operations on it
function internalExecScat(indice,itabValidIndices,twoDimsArray,tabValidIndices){
	loggerExec.info("Beginning operations on " +jsonTabFolder.TypePath[indice].path +":");
	var disableDelete=0;
	arrayUnregister[indice]=0;
	var nbError=0;
	var unreg=false;
	if(twoDimsArray[SHOW][indice]){
		if(jsonTabFolder.TypePath[indice].type=="study"){
			loggerExec.verbose("\r\nShowing :" );
			nbError+=addShowStudy(jsonTabFolder.TypePath[indice].path);
		}
		else if(jsonTabFolder.TypePath[indice].type=="chest"){
			loggerExec.verbose("\r\nShowing :" );
			nbError+=addShowFolder(jsonTabFolder.TypePath[indice].path);
		}
	}
	if(twoDimsArray[REGISTER][indice]){
		loggerExec.verbose("\r\nRegistering :" );
		nbError+=registerInLib(jsonTabFolder.TypePath[indice].path,destScat);
	}
	if(twoDimsArray[TRIM][indice]){
		loggerExec.verbose("\r\nTrimming :" );
		nbError+=trimStudy(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[COPY][indice]){
		loggerExec.verbose("\r\nCopying :" );
		var retCp=copyStudy(jsonTabFolder.TypePath[indice].path,"study");
		disableDelete+=retCp;
		nbError+=retCp;
	}
	if(twoDimsArray[ARCHIVE][indice]){
		loggerExec.verbose("\r\nArchiving :" );
		var retAr;
		if(jsonTabFolder.TypePath[indice].type=="study"){
			retAr=archiveStudy(jsonTabFolder.TypePath[indice].path);
		}
		else{
			retAr=archiveFolder(jsonTabFolder.TypePath[indice].path);
		}
		disableDelete+=retAr;
		nbError+=retAr;
	}
	if(twoDimsArray[DELETE][indice]){
		loggerExec.verbose("\r\nDeleting:" );
		if(disableDelete){
			loggerExec.info(jsonTabFolder.TypePath[indice].path+" has not been deleted because of a problem during an earlier steps");
		}
		else{
			nbError+=deleteStudy(jsonTabFolder.TypePath[indice].path);
			arrayUnregister[indice]=1;
			unreg=true;
		}
	}
	if(twoDimsArray[UNREGISTER][indice]){
		arrayUnregister[indice]=1;
		unreg=true;
	}
	if(nbError){
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path +", " + nbError +" errors\r\n\r\n");
	}
	else{
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path+"\r\n\r\n");
	}
	if(itabValidIndices<tabValidIndices.length-1){
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[itabValidIndices+1]].path +")" ;
		infoText.style.color="orange";
		infoText.onclick="";
	}
	else{
		if(unreg){
			loggerExec.verbose("\r\nUnregistering :" );
			unregister(arrayUnregister);
		}
		afficher("sync");
		loggerExec.info("End of execution : "+ nbTasksOk + " tasks completed, " +nbTasks+ " tasks requested, "+ nbShadowTasks +" implicit tasks : " + nbErrorMain +" Errors.\r\n\r\n");
		loggerExec.close();
		enableMain();
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		if(nbErrorMain){
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : " + nbErrorMain +". Please check the log at " + logExecPath;
			infoText.style.color="firebrick";
		}
		else{
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : 0. Please check the log at " + logExecPath;
			infoText.style.color="lightgreen";
		}
		infoText.onclick=(function(){if(fs.existsSync(logExecPath)){
				//exec("explorer.exe "+logExecPath);
				shell.openItem(logExecPath);
			}
			else alert("No log file found");
		});
		//Editor.log('nbTasks' + nbTasks);
		//Editor.log('nbTasksOk' + nbTasksOk);
	}
}

//Internal loop of the execFolder function
function internalExecFolder(indice,itabValidIndices,twoDimsArray,tabValidIndices){
	var disableDelete=0;
	var nbError=0;
	loggerExec.info("Beginning operations on " +jsonTabFolder.TypePath[indice].path +":");
	if(twoDimsArray[SHOW][indice]&& jsonTabFolder.TypePath[indice].type=="study"){
		loggerExec.verbose("\r\nShowing :" );
		nbError+=addShowStudy(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[SHOW][indice]&& jsonTabFolder.TypePath[indice].type=="chest"){
		loggerExec.verbose("\r\nShowing :" );
		nbError+=addShowFolder(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[SHOW][indice]&& jsonTabFolder.TypePath[indice].type=="archive"){
		loggerExec.verbose("\r\nShowing :" );
		nbError+=addShowArchive(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[SHOW][indice]&& jsonTabFolder.TypePath[indice].type=="pack"){
		loggerExec.verbose("\r\nShowing :" );
		nbError+=addShowAblob(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[TRIM][indice] && jsonTabFolder.TypePath[indice].type=="study"){
		loggerExec.verbose("\r\nTrimming :" );
		nbError+=trimStudy(jsonTabFolder.TypePath[indice].path);
	}
	if(twoDimsArray[REGISTER][indice]){
		if(jsonTabFolder.TypePath[indice].type=="archive" || jsonTabFolder.TypePath[indice].type=="pack"){
			if(isValidLib(destAcat)){
				loggerExec.verbose("\r\nRegistering :" );
				nbError+=registerInLib(jsonTabFolder.TypePath[indice].path,destAcat);
			}
			else{
				window.alert("Please select a valid acat destination");
			}
		}
		else if(jsonTabFolder.TypePath[indice].type=="study" || jsonTabFolder.TypePath[indice].type=="chest"){
			if(isValidLib(destScat)){
				loggerExec.verbose("\r\nRegistering :" );
				nbError+=registerInLib(jsonTabFolder.TypePath[indice].path,destScat);
			}
			else{
				window.alert("Please select a valid scat destination");
			}
		}
	}
	if(twoDimsArray[COPY][indice]){
		loggerExec.verbose("\r\nCopying :" );
		var ret=copyStudy(jsonTabFolder.TypePath[indice].path,jsonTabFolder.TypePath[indice].type);
		disableDelete+=ret;
		nbError+=ret;
	}
	if(twoDimsArray[ARCHIVE][indice] && jsonTabFolder.TypePath[indice].type=="study"){
		loggerExec.verbose("\r\nArchiving :" );
		var retAr=archiveStudy(jsonTabFolder.TypePath[indice].path);
		disableDelete+=retAr;
		nbError+=retAr;
	}
	if(twoDimsArray[ARCHIVE][indice] && jsonTabFolder.TypePath[indice].type=="chest"){
		loggerExec.verbose("\r\nArchiving :" );
		var retAr=archiveFolder(jsonTabFolder.TypePath[indice].path);
		disableDelete+=retAr;
		nbError+=retAr;
	}
	if(twoDimsArray[EXPAND][indice] && (jsonTabFolder.TypePath[indice].type=="archive" || jsonTabFolder.TypePath[indice].type=="pack")){
		loggerExec.verbose("\r\nExpanding :" );
		var retEx=expandStudy(jsonTabFolder.TypePath[indice].path);
		disableDelete+=retEx;
		nbError+=retEx;
	}
	if(twoDimsArray[DELETE][indice]){
		loggerExec.verbose("\r\nDeleting :" );
		if(disableDelete){
			loggerExec.info(jsonTabFolder.TypePath[indice].path+" has not been deleted because of a problem during an earlier steps");
		}
		else{
			nbError+deleteStudy(jsonTabFolder.TypePath[indice].path);
		}
	}
	
	if(nbError){
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path +", " + nbError +" errors\r\n\r\n");
	}
	else{
		loggerExec.info("End of operations on "+ jsonTabFolder.TypePath[indice].path+"\r\n\r\n");
	}
	if(itabValidIndices<tabValidIndices.length-1){
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		infoText.textContent= "PLEASE WAIT (Processing : "+ jsonTabFolder.TypePath[tabValidIndices[itabValidIndices+1]].path +")" ;
		infoText.style.color="orange";
		infoText.onclick="";
	}
	else{
		afficher("sync");
		loggerExec.info("End of execution : "+ nbTasksOk + " tasks completed, " +nbTasks+ " tasks requested, "+ nbShadowTasks +" implicit tasks : " + nbErrorMain +" Errors.\r\n\r\n");
		loggerExec.close();
		enableMain();
		var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
		if(nbErrorMain){
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : " + nbErrorMain +". Please check the log at " + logExecPath;
			infoText.style.color="firebrick";
		}
		else{
			infoText.textContent= "ALL TASKS FINISHED – SCHEDULED : " + nbTasks + ", COMPLETED : "+ nbTasksOk + " , ERRORS : 0.  Please check the log at " + logExecPath;
			infoText.style.color="lightgreen";
		}
		infoText.onclick=(function(){if(fs.existsSync(logExecPath)){
				//exec("explorer.exe "+logExecPath);
				shell.openItem(logExecPath);
			}
			else alert("No log file found");
		});
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Execute sub-functions 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//disable main division
function disableMain(){
	document.getElementById('simple.03').shadowRoot.getElementById('maindiv').style.pointerEvents = "none";
	electron.remote.getCurrentWindow().setMenuBarVisibility(false);
}

//enable main division
function enableMain(){
	document.getElementById('simple.03').shadowRoot.getElementById('maindiv').style.pointerEvents = "all";
	electron.remote.getCurrentWindow().setMenuBarVisibility(true);
}

//register a study/archive in the main lib
function registerMain(pathToRegister){
	if(!JsonLib.libArray.includes(pathToRegister)){
		try{
			JsonLib.libArray.push(pathToRegister);
			fs.writeFileSync(pathMain, JSON.stringify(JsonLib) , 'utf-8');
		}
		catch(err){
			loggerExec.debug("Error : " +err + " into registerMain");
			loggerExec.error(pathToRegister+" failed to register into "+ pathMain);
			nbErrorMain++;
			return 1;
		}
		loggerExec.info(pathToRegister+" registered into "+ pathMain);
	}
	else{
		loggerExec.info(pathToRegister+" is already present in this catalog." );
	}
}

//Unregister entries from a catalog based on an array
function unregister(arrayUnreg){
	var newArray=[];
	var deletedArray=[];
	if(jsonTabFolder.TypePath.length>0){
		for(var i=0; i<jsonTabFolder.TypePath.length; i++){
			if(arrayUnreg[i]){
				deletedArray.push(jsonTabFolder.TypePath[i].path);
			}
		}
		for(var indiceJson=0; indiceJson<JsonLib.libArray.length;indiceJson++){
			var isDeleted=false;
			for(var iDel=0; iDel<deletedArray.length; iDel++){
				if(JsonLib.libArray[indiceJson]==deletedArray[iDel]){
					isDeleted=true;
				}
			}
			if(!isDeleted){
				newArray.push(JsonLib.libArray[indiceJson]);
			}
		}
		JsonLib.libArray=newArray;
		try{
				fs.writeFileSync(pathMain, JSON.stringify(JsonLib) , 'utf-8');
				for(var i=0; i<deletedArray.length; i++){
					loggerExec.info("Sucessfully unregistered "+ deletedArray[i]+" from main catalog");
					nbTasksOk++;
				}
				loggerExec.verbose("\r\n\r\n");
				return 0;
		}
		catch(err){
			loggerExec.debug("Error : " +err + " into unregister");
			loggerExec.error("Failed to unregister "+deletedArray.length + "items");
			nbErrorMain++;
			loggerExec.verbose("\r\n\r\n");
			return deletedArray.length;
		}
	}
	else {
		loggerExec.verbose("\r\n\r\n");
		return 0;
	}
}

//Copies a study or archive on destfolder
function copyStudy(pathStudy,type){
	var nbErrorLoc=0;
	if(destFolder!="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
		var exists=fs.existsSync(path.join(destFolder, path.parse(pathStudy).base));
		if(exists){
			loggerExec.error(pathStudy + " has not been copied : the destination "+type+" already exists");
			nbErrorMain++;
			return 1;
		}
		else {
			try{
				if(type=="archive" || type=="pack"){
					fs.copyFileSync(pathStudy,path.join(destFolder,  path.parse(pathStudy).base));
					if(destAcat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
						if(pathMain!=destAcat){
							nbErrorLoc+=registerInLib(path.join(destFolder,  path.parse(pathStudy).base), destAcat);
							nbShadowTasks++;
						}
						else{
							nbErrorLoc+=registerMain(path.join(destFolder,  path.parse(pathStudy).base));
							nbShadowTasks++;
						}
					}
				}
				else if(type=="study" || type=="chest"){
					fs.copySync(pathStudy,path.join(destFolder, path.parse(pathStudy).base));
					if(destScat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
						nbErrorLoc+=registerInLib(path.join(destFolder, path.parse(pathStudy).base), destScat);
						nbShadowTasks++;
					}
				}
				else{
					loggerExec.error("Wrong type on : "+pathStudy);
					nbErrorMain++;
					return 1;
				}
				
				
				if(checkCopyHash(pathStudy,path.join(destFolder, path.parse(pathStudy).base))){
					loggerExec.info(pathStudy + " has been copied to : "+ destFolder);
					nbTasksOk++;
					return nbErrorLoc;
				}
				else 
				{
					loggerExec.error(pathStudy + " has not been copied properly");
					nbErrorMain++;
					return 1;				
				}
			}
			catch(err){
				if(fs.exists(path.join(destFolder, path.parse(pathStudy).base))){
					loggerExec.error(pathStudy + " copy ended in error : " + err);
				}
				else{
					loggerExec.error(pathStudy + " has not been copied : " + err);
				}
				nbErrorMain++;
				return 1;
			}
		}
	}
}

// uses 7z to put a file into an archive
function addFileToArchive(archivePath,filePath){
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" a "'+archivePath +'" "' + filePath +'" -p' + password;
	try{
		var stringFile=execSync(cmd);

		var line = stringFile.toString().match("Everything is Ok" );
		if(line){
			return "OK";
		}
		else return 0;
	}
	catch(err){
		loggerExec.debug(err + " inside addFileToArchive");
		return 0;
	}
}

//deletes temporary files from an archiving process
function deleteTempFiles(studyName){
	deleteFileIfExists(path.join(tmpDir,studyName+".meta"));
	deleteFileIfExists(path.join(tmpDir,studyName+".para"));
	deleteFileIfExists(path.join(tmpDir,studyName+".hash"));
	deleteFileIfExists(path.join(tmpDir,studyName+".cert"));
}

//deletes a file if it exists
function deleteFileIfExists(filePath){
	try{
		if (fs.existsSync(filePath)){
			fs.unlinkSync(filePath);
		}
	}
	catch(err){
		loggerExec.error("Problem while suppressing "+filePath + err);
	}
} 

//Archives a study on destfolder or on site
function archiveStudy(pathStudy){
	var hash=utils.getHashStudy(pathStudy,loggerExec);
	if(hash=="error"){
		loggerExec.error(pathStudy + " has not been archived due to a hash problem");
		nbErrorMain++;
		return 1;
	}
	var studyName=path.parse(pathStudy).base;
	var destinationPath;
	if(destFolder && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){ 
		destinationPath=destFolder;
	}	
	else{
		destinationPath=path.parse(pathStudy).dir;
	}
	var archiveDest=path.join(destinationPath,pathStudy.match(/([^\\|\/]*)\/*$/)[1])+'.antar';
	var addNumber=0;
	while(fs.existsSync(archiveDest)){
		if(addNumber<999){
			addNumber++;
			archiveDest=path.join(destinationPath,pathStudy.match(/([^\\|\/]*)\/*$/)[1])+"@"+utils.leftPad(addNumber,3)+'.antar';
		}
		else{
			loggerExec.error(pathStudy + " has not been archived : too many copies at the same place");
			nbErrorMain++;
			return 1;
		}
	}
	try{
		if(destFolder && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
			var meta= "[destinat]"+ destFolder + "\n[ADOversn]110";
		}
		else{
			var meta= "[destinat]"+ path.parse(pathStudy).dir + "\n[ADOversn]110";
		}
		var pathInput=path.join(pathStudy,"input");
		var pathOutput=path.join(pathStudy,"output");
		var pathUser=path.join(pathStudy,"user");
		var tabTag=utils.readTag(pathStudy,loggerActions);
		var metrics="[I-Identi]\n[ExtrName]"+  path.parse(pathStudy).base
		+ "\n[IntrName]"+ readName(pathStudy)
		+ "\n[Location]"+ path.parse(pathStudy).dir
		+ "\n[VersionN]"+ utils.readVersion(pathStudy)
		+ "\n[LastSave]"+ readModifDate(pathStudy)
		+ "\n[OrigSLoc]"+ path.parse(pathStudy).dir;
		for(var i =0; i<tabTag.length;i++){
			if(i<9){
				metrics+=  "\n[TagNb_0"+(i+1)+"]"+ tabTag[i];
			}
			else{
				metrics+=  "\n[TagNb_"+(i+1)+"]"+ tabTag[i];
			}
		}
		if(path.parse(pathMain).ext==".scat"){
			metrics+="\n[OrigSCat]"+pathMain;
		}
		metrics+= "\n[II-Mtrcs]";
		
		if(fs.existsSync(pathInput) && fs.statSync(pathInput).isDirectory()){
					metrics+="\n[InptSize]"+getFolderSizeSync(pathInput);
					metrics+="\n[InptFile]"+fs.listTreeSync(pathInput).length;
		}
		if(fs.existsSync(pathOutput) && fs.statSync(pathOutput).isDirectory()){
					metrics+="\n[OutputSz]"+getFolderSizeSync(pathOutput);
					metrics+="\n[OutputFl]"+fs.listTreeSync(pathOutput).length;
		}
		if(fs.existsSync(pathUser) && fs.statSync(pathUser).isDirectory()){
					metrics+="\n[UserSize]"+getFolderSizeSync(pathUser);
					metrics+="\n[UserFile]"+fs.listTreeSync(pathUser).length;
		}
		if(fs.existsSync(pathStudy) && fs.statSync(pathStudy).isDirectory()){
					metrics+="\n[TotlSize]"+getFolderSizeSync(pathStudy);
					metrics+="\n[TotlFile]"+fs.listTreeSync(pathStudy).length;
		}
		if(meta!="Error" && hash!="Error"){
			os.saveStringInTempFile(studyName+".meta",meta);
			os.saveStringInTempFile(studyName+".para",metrics);
			os.saveStringInTempFile(studyName+".hash",hash);
		}
		else{
			loggerExec.error(pathStudy + " has not been archived due to a data problem");
			nbErrorMain++;
			return 1;
		}
	}
	catch(err)
	{
		loggerExec.debug("Error : " +err + " inside archiveStudy");
		loggerExec.error(pathStudy + " has not been archived due to a data problem");
		nbErrorMain++;
		return 1;
	}
	if(destFolder!="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
		var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" a' + archiveOpt + '"' + archiveDest + '" "'+ pathStudy + '" -p' + password;
	
		try{
			var ret=execSync(cmd);
			
			if(isArchiveOk(archiveDest)&& addFileToArchive(archiveDest,path.join(tmpDir,studyName+".meta")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".para")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".hash")) ){
				if(destAcat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
					registerInLib(archiveDest, destAcat);
					nbShadowTasks++;
				}
				nbTasksOk++;
				loggerExec.info(pathStudy + " has been archived into : " + archiveDest);
				deleteTempFiles(studyName);
				return 0;
			}
			else{
				fs.unlinkSync(archiveDest);
				loggerExec.error(pathStudy + " has not been archived");
				nbErrorMain++;
				deleteTempFiles(studyName);
				return 1;
			}
		}
		catch(err){
			loggerExec.debug(err+ "inside ArchiveStudy");
			loggerExec.error(pathStudy + " has not been archived");
			nbErrorMain++;
			deleteTempFiles(studyName);
			return 1;
		}
	}
	else{
		var cmd = '"'+os.getSevenZip(appPath, loggerActions)+'" a'+ archiveOpt + '"'+archiveDest+'" "'+ pathStudy+'" -mhe -p' + password;
		try{
			var ret=execSync(cmd);
			
			if(isArchiveOk(archiveDest)&& addFileToArchive(archiveDest,path.join(tmpDir,studyName+".meta")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".para")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".hash")) ){
				if(destAcat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
					registerInLib(archiveDest, destAcat);
					nbShadowTasks++;
				}
				
				nbTasksOk++;
				loggerExec.info(pathStudy + " has been archived into : " + archiveDest);
				deleteTempFiles(studyName);
				
				return 0;
			}
			else{
				fs.unlinkSync(archiveDest);
				nbErrorMain++;
				loggerExec.error(pathStudy + " has not been archived");
				deleteTempFiles(studyName);
				return 1;
			}
		}
		catch(err){
			loggerExec.debug("Error : " +err + " inside archiveStudy");
			loggerExec.error(pathStudy + " has not been archived" +err);
			nbErrorMain++;
			deleteTempFiles(studyName);
			return 1;
		}
	}
}

//Archives a chest on destfolder or on site
function archiveFolder(pathStudy){
	var hash=utils.getHashStudy(pathStudy,loggerExec);
	if(hash=="error"){
		loggerExec.error(pathStudy + " has not been archived due to a hash problem");
		nbErrorMain++;
		return 1;
	}
	var studyName=path.parse(pathStudy).base;
	var destinationPath;
	if(destFolder && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){ 
		destinationPath=destFolder;
	}	
	else{
		destinationPath=path.parse(pathStudy).dir;
	}
	var archiveDest=path.join(destinationPath,pathStudy.match(/([^\\|\/]*)\/*$/)[1])+'.antpack';
	var addNumber=0;
	while(fs.existsSync(archiveDest)){
		if(addNumber<999){
			addNumber++;
			archiveDest=path.join(destinationPath,pathStudy.match(/([^\\|\/]*)\/*$/)[1])+"@"+utils.leftPad(addNumber,3)+'.antpack';
		}
		else{
			loggerExec.error(pathStudy + " has not been archived : too many copies at the same place");
			nbErrorMain++;
			return 1;
		}
	}
	try{
		if(destFolder && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
			var meta= "[destinat]"+ destFolder + "\n[ADOversn]110";
		}
		else{
			var meta= "[destinat]"+ path.parse(pathStudy).dir + "\n[ADOversn]110";
		}
		var metrics="[I-Identi]\n[ExtrName]"+  path.parse(pathStudy).base
		+ "\n[Location]"+ path.parse(pathStudy).dir
		+ "\n[LastSave]"+ readModifDate(pathStudy)
		+ "\n[OrigFLoc]"+ path.parse(pathStudy).dir;
		if(path.parse(pathMain).ext==".scat"){
			metrics+="\n[OrigSCat]"+pathMain;
		}
		metrics+= "\n[II-Mtrcs]";
		
		if(fs.existsSync(pathStudy) && fs.statSync(pathStudy).isDirectory()){
					metrics+="\n[TotlSize]"+getFolderSizeSync(pathStudy);
					metrics+="\n[TotlFile]"+fs.listTreeSync(pathStudy).length;
		}
		if(meta!="Error" && hash!="Error"){
			os.saveStringInTempFile(studyName+".meta",meta);
			os.saveStringInTempFile(studyName+".para",metrics);
			os.saveStringInTempFile(studyName+".hash",hash);
		}
		else{
			loggerExec.error(pathStudy + " has not been archived due to a data problem");
			nbErrorMain++;
			return 1;
		}
	}
	catch(err)
	{
		loggerExec.debug("Error : " +err + " inside archiveFolder");
		loggerExec.error(pathStudy + " has not been archived due to a data problem");
		nbErrorMain++;
		return 1;
	}
	if(destFolder!="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
		var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" a ' + archiveOpt + ' "'+archiveDest+'" "'+ pathStudy+'" -p' + password;
	
		try{
			var ret=execSync(cmd);
			
			if(isArchiveOk(archiveDest)&& addFileToArchive(archiveDest,path.join(tmpDir,studyName+".meta")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".para")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".hash")) ){
				if(destAcat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
					registerInLib(archiveDest, destAcat);
					nbShadowTasks++;
				}
				nbTasksOk++;
				loggerExec.info(pathStudy + " has been archived into : " + archiveDest);
				deleteTempFiles(studyName);
				return 0;
			}
			else{
				fs.unlinkSync(archiveDest);
				loggerExec.error(pathStudy + " has not been archived");
				nbErrorMain++;
				deleteTempFiles(studyName);
				return 1;
			}
		}
		catch(err){
			loggerExec.debug(err+ "inside ArchiveFolder");
			loggerExec.error(pathStudy + " has not been archived");
			nbErrorMain++;
			deleteTempFiles(studyName);
			return 1;
		}
	}
	else{
		var cmd = '"'+os.getSevenZip(appPath, loggerActions)+'" a ' + archiveOpt + ' "'+archiveDest+'" "'+ pathStudy+'" -mhe -p' + password;
		try{
			var ret=execSync(cmd);
			
			if(isArchiveOk(archiveDest)&& addFileToArchive(archiveDest,path.join(tmpDir,studyName+".meta")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".para")) && addFileToArchive(archiveDest,path.join(tmpDir,studyName+".hash")) ){
				if(destAcat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
					registerInLib(archiveDest, destAcat);
					nbShadowTasks++;
				}
				
				nbTasksOk++;
				loggerExec.info(pathStudy + " has been archived into : " + archiveDest);
				deleteTempFiles(studyName);
				
				return 0;
			}
			else{
				fs.unlinkSync(archiveDest);
				nbErrorMain++;
				loggerExec.error(pathStudy + " has not been archived");
				deleteTempFiles(studyName);
				return 1;
			}
		}
		catch(err){
			loggerExec.debug("Error : " +err + " inside archiveFolder");
			loggerExec.error(pathStudy + " has not been archived" +err);
			nbErrorMain++;
			deleteTempFiles(studyName);
			return 1;
		}
	}
}

//Expands a study on destfolder or on site
function expandStudy(pathStudy){
	var isdir=0;
	var nberr=0;//errors while registering
	if(destFolder!="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
		var cmd = '"'+os.getSevenZip(appPath, loggerActions)+'" x "'+ pathStudy +'" "-o'+ destFolder+'" -x!*.meta -x!*.para -x!*.hash -x!*.cert -p' + password;
		var pathDestFolder=path.join(destFolder, utils.getExtNameFromAntar(pathStudy,password,loggerActions,loggerExec));
		try{
			isdir=fs.statSync(pathDestFolder).isDirectory();
			loggerExec.error(pathStudy + " has not been expanded : the destination study already exists");
			nbErrorMain++;
			return 1;
		}
		catch(err) {
			try{
				var ret=execSync(cmd);
				if(destScat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
					nberr+=registerInLib(pathDestFolder, destScat);
					nbShadowTasks++;
				}
				if(readAdoVersion(pathStudy)>100){
					if(checkHashDest(pathStudy,pathDestFolder)=="OK"){
						nbTasksOk++;
						loggerExec.info(pathStudy + " has been expanded into " + destFolder);
						return nberr;
					}
					else{
						loggerExec.debug("checkHashDest failed inside expandStudy");
						loggerExec.error(pathStudy + " has not been expanded properly");
						nbErrorMain++;
						return 1;
					}
				}
				else{
					nbTasksOk++;
					loggerExec.info(pathStudy + " has been expanded into " + destFolder + " ; the hash has not been checked because this archive was created by an incompatible version.");
					return nberr;
				}
			}
			catch(err){
				loggerExec.debug(err + " while checking hash inside expandStudy");
				loggerExec.error(pathStudy + " has not been expanded properly");
				nbErrorMain++;
				return 1;
			}
		}
	}
	else{
		var pathDestFolder=path.join(path.parse(pathStudy).dir, utils.getExtNameFromAntar(pathStudy,password,loggerActions,loggerExec));
		var cmd = '"'+os.getSevenZip(appPath, loggerActions)+'" x "'+ pathStudy +'" "-o'+ path.dirname(pathStudy)+'" -x!*.meta -x!*.para -x!*.hash -x!*.cert -p' + password;
		try{
			isdir=fs.statSync(pathDestFolder).isDirectory();
			loggerExec.error(pathStudy + " has not been expanded : the destination study already exists");
			nbErrorMain++;
			return 1;
		}
		catch(err) {
			try{
				var ret=execSync(cmd);
				if(destScat!="" && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
					registerInLib(pathDestFolder, destScat);
					nbShadowTasks++;
				}
				if(readAdoVersion(pathStudy)>100){
					if(checkHashDest(pathStudy,pathDestFolder)=="OK"){
						nbTasksOk++;
						loggerExec.info(pathStudy + " has been expanded into " + path.dirname(pathStudy));
						return 0;
					}
					else{
						loggerExec.error(pathStudy + " has not been expanded properly");
						nbErrorMain++;
					}
				}
				else{
					nbTasksOk++;
					loggerExec.info(pathStudy + " has been expanded into " + path.dirname(pathStudy) + " ; the hash has not been checked because this archive was created by an incompatible version.");
					return nberr;
				}
			}
			catch(err){
				loggerExec.debug(err + " while checking hash");
				loggerExec.error(pathStudy + " has not been expanded properly");
				nbErrorMain++;
				return 1;
			}
		}
	}
}

//returns the version of the data organizer that the archive was created with
function readAdoVersion(pathArchive){
	var cmd ='"'+os.getSevenZip(appPath, loggerExec)+'" e "'+pathArchive +'" "*.meta" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);
		var line = stringFile.toString().match(".*ADOversn.*" );
		var version=line[0].match("[0-9]{1,}")[0];
		return version;
	}
	catch(err){
		return "error";
	}
}

//Delete the outputs of a study
function trimStudy(pathStudy){
	var outputPath=path.join(pathStudy, "output");
	var isdir=0;
	try{
		isdir=fs.statSync(outputPath).isDirectory();
	}
	 catch(err) {
		loggerExec.info("This study has no output : " + pathStudy);
		nbTasksOk++;
		return 0;
	}
	if(isdir){
		try{
			fs.removeSync(outputPath);
			loggerExec.info("This study has been trimmed : " + pathStudy);
			nbTasksOk++;
			return 0;
		}
		catch(err) {
			loggerExec.debug("Error : " +err + " inside trimStudy");
			loggerExec.error("This study could not be trimmed : " + pathStudy);
			nbErrorMain++;
			return 1;
		}
	}
}

//Delete a study
function deleteStudy(pathStudy){
	var exists=fs.existsSync(pathStudy);
	if(!exists){
		loggerExec.error("Could not delete, this study does not exist : " + pathStudy);
		nbErrorMain++;
		return 1;
	}
	else{
		try{
			fs.removeSync(pathStudy);
			loggerExec.info("This study has been deleted : " + pathStudy);
			nbTasksOk++;
			return 0;
		}
		catch(err) {
			loggerExec.debug("Error : " +err + " inside deleteStudy");
			loggerExec.error("This study could not be deleted : " + pathStudy);
			nbErrorMain++;
			return 1;
		}
	}
}

//adds a chest to the showfile
function addShowFolder(pathFolder){
	if(showFile!=""){
		try{
			var metrics="[I-Identi]\r\n[itemType]chest\r\n[ExtrName]"+  path.parse(pathFolder).base
			+ "\r\n[Location]"+ path.parse(pathFolder).dir
			+ "\r\n[StdyHash]"+ utils.getHashStudy(pathFolder,loggerExec)
			+ "\r\n[LastSave]"+ utils.toJSONLocal(fs.statSync(pathFolder).mtime);
			metrics+="\r\n[II-Mtrcs]";
			if(fs.existsSync(pathFolder) && fs.statSync(pathFolder).isDirectory()){
						metrics+="\r\n[TotlSize]"+getFolderSizeSync(pathFolder);
						metrics+="\r\n[TotFiles]"+fs.listTreeSync(pathFolder).length;
			}
			var commentsPath=path.join(pathFolder,"info.ado");
			if(fs.existsSync(commentsPath)){
				metrics+="\r\n[usrsNote]";
				var lines=fs.readFileSync(commentsPath, 'utf8').split(/[\r\n]+/);
				for(var i=0;i<lines.length;i++){
					metrics+="\r\n[textLine]"+lines[i];
				}
			}
			metrics+="\r\n\r\n";
			if(!fs.existsSync(showFile)){
				if(path.parse(pathMain).ext==".scat"){
					fs.appendFileSync(showFile, "[OrigSCat]"+ pathMain +"\r\n\r\n");
				}
				else{
					fs.appendFileSync(showFile, "[OrigPort]"+ pathMain +"\r\n\r\n");
				}
			}
			fs.appendFileSync(showFile, metrics);
			nbTasksOk++;
			loggerExec.info(pathFolder + " succesfully shown to " + showFile);
			return 0;
		}
		catch(err){
			loggerExec.debug("Error : " +err + " inside addShowFolder");
			loggerExec.error(pathFolder + ' "show" function in error. ');
			nbErrorMain++;
			return 1;
		}
	}
	else{
		loggerExec.error(pathFolder + ' "show" function in error. ');
		nbErrorMain++;
		return 1;
	}
}

//adds a study to the showfile
function addShowStudy(pathStudy){
	if(showFile!=""){
		try{
			var pathInput=path.join(pathStudy,"input");
			var pathOutput=path.join(pathStudy,"output");
			var pathUser=path.join(pathStudy,"user");
			var tabTag=utils.readTag(pathStudy,loggerActions);
			var metrics="[I-Identi]\r\n[itemType]Study\r\n[ExtrName]"+  path.parse(pathStudy).base
			+ "\r\n[IntrName]"+ readName(pathStudy)
			+ "\r\n[Location]"+ path.parse(pathStudy).dir
			+ "\r\n[StdyHash]"+ utils.getHashStudy(pathStudy,loggerExec)
			+ "\r\n[VersionN]"+ utils.readVersion(pathStudy)
			+ "\r\n[LastSave]"+ readModifDate(pathStudy);
			for(var i =0; i<tabTag.length;i++){
				if(i<9){
					metrics+=  "\n[TagNb_0"+(i+1)+"]"+ tabTag[i];
				}
				else{
					metrics+=  "\n[TagNb_"+(i+1)+"]"+ tabTag[i];
				}
			}
			metrics+="\r\n[II-Mtrcs]";
			if(fs.existsSync(pathInput) && fs.statSync(pathInput).isDirectory()){
						metrics+="\r\n[InptSize]"+getFolderSizeSync(pathInput);
						metrics+="\r\n[InptFile]"+fs.listTreeSync(pathInput).length;
			}
			if(fs.existsSync(pathOutput) && fs.statSync(pathOutput).isDirectory()){
						metrics+="\r\n[OutputSz]"+getFolderSizeSync(pathOutput);
						metrics+="\r\n[OutputFl]"+fs.listTreeSync(pathOutput).length;
			}
			if(fs.existsSync(pathUser) && fs.statSync(pathUser).isDirectory()){
						metrics+="\r\n[UserSize]"+getFolderSizeSync(pathUser);
						metrics+="\r\n[UserFile]"+fs.listTreeSync(pathUser).length;
			}
			if(fs.existsSync(pathStudy) && fs.statSync(pathStudy).isDirectory()){
						metrics+="\r\n[TotlSize]"+getFolderSizeSync(pathStudy);
						metrics+="\r\n[TotFiles]"+fs.listTreeSync(pathStudy).length;
			}
			var commentsPath=path.join(path.join(pathStudy,"settings"),"comments.txt");
			if(fs.existsSync(commentsPath)){
				metrics+="\r\n[usrsNote]";
				metrics+=utils.getLinesFromXmlFile(commentsPath);
			}
			metrics+="\r\n\r\n";
			if(!fs.existsSync(showFile)){
				if(path.parse(pathMain).ext==".scat"){
					fs.appendFileSync(showFile, "[OrigSCat]"+ pathMain +"\r\n\r\n");
				}
				else{
					fs.appendFileSync(showFile, "[OrigPort]"+ pathMain +"\r\n\r\n");
				}
			}
			fs.appendFileSync(showFile, metrics);
			nbTasksOk++;
			loggerExec.info(pathStudy + " succesfully shown to " + showFile);
			return 0;
		}
		catch(err){
			loggerExec.debug("Error : " +err + " inside addShowStudy");
			loggerExec.error(pathStudy + ' "show" function in error. ');
			nbErrorMain++;
			return 1;
		}
	}
	else{
		loggerExec.error(pathStudy + ' "show" function in error. ');
		nbErrorMain++;
		return 1;
	}
}

//adds a show archive to the showfile
function addShowArchive(pathArchive){
	if(showFile!=""){
		try{
			var tabTag=utils.getTagsFromAntar(pathArchive,password,loggerActions,loggerExec);
			var metrics="[I-Identi]\r\n[itemType]Archive\r\n[ArchName]"+ path.parse(pathArchive).base
			+ "\r\n[OrigSCat]"+ utils.getMetaFromAntar(pathArchive,"OrigSCat",password,loggerActions,loggerExec)
			+ "\r\n[OrigSLoc]"+ utils.getMetaFromAntar(pathArchive,"OrigSLoc",password,loggerActions,loggerExec)
			+ "\r\n[ExtrName]"+ utils.getMetaFromAntar(pathArchive,"ExtrName",password,loggerActions,loggerExec)
			+ "\r\n[IntrName]"+ utils.getMetaFromAntar(pathArchive,"IntrName",password,loggerActions,loggerExec)
			+ "\r\n[Location]"+ path.parse(pathArchive).dir
			+ "\r\n[StdyHash]"+ utils.getHashFromAntar(pathArchive,password,loggerActions,loggerExec)
			+ "\r\n[ArchHash]"+ utils.getHashStudy(pathArchive,loggerExec)
			+ "\r\n[VersionN]"+ utils.readVersionAntar(pathArchive,password,loggerActions,loggerExec)
			+ "\r\n[LastSave]"+ utils.toJSONLocal(fs.statSync(pathArchive).mtime);		
			for (var i=0; i<tabTag.length;i++){
				if(i<9){
					metrics+="\r\n[TagNb_0"+(i+1)+"]"+ tabTag[i];
				}
				else{
					metrics+="\r\n[TagNb_"+(i+1)+"]"+ tabTag[i];
				}
			}
			metrics+="\r\n[II-Mtrcs]";
			metrics+="\r\n[UnPackSz]"+ utils.getMetaFromAntar(pathArchive,"TotlSize",password,loggerActions,loggerExec);
			metrics+="\r\n[UnPackFl]"+ utils.getMetaFromAntar(pathArchive,"TotlFile",password,loggerActions,loggerExec);
			metrics+="\r\n[PackSize]"+ fs.getSizeSync(pathArchive);
			metrics+="\r\n[PackFile]1";
			metrics+="\r\n[usrsNote]";
			metrics+=getLinesFromAntar(pathArchive);
			metrics+="\r\n\r\n";
			if(!fs.existsSync(showFile)){
				if(path.parse(pathMain).ext==".acat"){
					fs.appendFileSync(showFile, "[OrigAcat]"+ pathMain +"\r\n\r\n");
				}
				else{
					fs.appendFileSync(showFile, "[OrigPort]"+ pathMain +"\r\n\r\n");
				}
			}
			fs.appendFileSync(showFile, metrics);
			nbTasksOk++;
			loggerExec.info(pathArchive + " succesfully shown to " + showFile);
			return 0;
		}
		catch(err){
			loggerExec.error(err + ' "show" function in error. ');
			nbErrorMain++;
			return 1;
		}
	}
	else{
		loggerExec.error(pathStudy + ' "show" function in error. ');
		nbErrorMain++;
		return 1;
	}
}

//adds a show pack to the showfile
function addShowAblob(pathArchive){
	if(showFile!=""){
		try{
			var metrics="[I-Identi]\r\n[itemType]Pack\r\n[ArchName]"+ path.parse(pathArchive).base
			+ "\r\n[OrigSCat]"+ utils.getMetaFromAntar(pathArchive,"OrigSCat",password,loggerActions,loggerExec)
			+ "\r\n[OrigSLoc]"+ utils.getMetaFromAntar(pathArchive,"OrigSLoc",password,loggerActions,loggerExec)
			+ "\r\n[ExtrName]"+ utils.getMetaFromAntar(pathArchive,"ExtrName",password,loggerActions,loggerExec)
			+ "\r\n[Location]"+ path.parse(pathArchive).dir
			+ "\r\n[StdyHash]"+ utils.getHashFromAntar(pathArchive,password,loggerActions,loggerExec)
			+ "\r\n[ArchHash]"+ utils.getHashStudy(pathArchive,loggerExec)
			+ "\r\n[LastSave]"+ utils.toJSONLocal(fs.statSync(pathArchive).mtime);	
			metrics+="\r\n[II-Mtrcs]";
			metrics+="\r\n[UnPackSz]"+ utils.getMetaFromAntar(pathArchive,"TotlSize",password,loggerActions,loggerExec);
			metrics+="\r\n[UnPackFl]"+ utils.getMetaFromAntar(pathArchive,"TotlFile",password,loggerActions,loggerExec);
			metrics+="\r\n[PackSize]"+ fs.getSizeSync(pathArchive);
			metrics+="\r\n[PackFile]1";
			metrics+="\r\n[usrsNote]";
			var lines=utils.getLinesFromAblob(pathArchive,loggerExec,password).toString().split(/[\r\n]+/);
			for(var i=0;i<lines.length;i++){
				metrics+="\r\n[textLine]"+lines[i];
			}
			metrics+="\r\n\r\n";
			if(!fs.existsSync(showFile)){
				if(path.parse(pathMain).ext==".acat"){
					fs.appendFileSync(showFile, "[OrigAcat]"+ pathMain +"\r\n\r\n");
				}
				else{
					fs.appendFileSync(showFile, "[OrigPort]"+ pathMain +"\r\n\r\n");
				}
			}
			fs.appendFileSync(showFile, metrics);
			nbTasksOk++;
			loggerExec.info(pathArchive + " succesfully shown to " + showFile);
			return 0;
		}
		catch(err){
			loggerExec.error(err + ' "show" function in error. ');
			nbErrorMain++;
			return 1;
		}
	}
	else{
		loggerExec.error(pathStudy + ' "show" function in error. ');
		nbErrorMain++;
		return 1;
	}
}

//Adds a study in a catalog
function registerInLib(PathToRegister, lib){
	try{
		var JsonLibToModify = JSON.parse(fs.readFileSync(lib, 'utf8'));
		if(!JsonLibToModify.libArray.includes(PathToRegister)){
			JsonLibToModify.libArray.push(PathToRegister);
			fs.writeFileSync(lib, JSON.stringify(JsonLibToModify) , 'utf-8');
			nbTasksOk++;
			loggerExec.info(PathToRegister+" registered into "+ lib);
			return 0;
		}
		else{
			loggerExec.info(PathToRegister+" is already present in this catalog." );
			nbTasksOk++;
			return 0;
		}
	}
	catch(err){
		loggerExec.error(PathToRegister+" failed to register into "+ lib +" : " + err);
		nbErrorMain++;
		return 1;
	}
}

//searches the pathmain for studies and archive and displays them
function searchAndDisplayFolder(){
	recursiveSearch(pathMain, researchDepth );
	
	var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
	for(var i=0;i<tabArrow.length;i++){
		tabArrow[i].innerHTML="&#x21D5";
		tabArrow[i].style.color="#bdbdbd";
	}
	displayJsonTabFolder();
}

//Tab of valid execute actions, returns all the indices of lines to be executed
function tabExec(twoDimsArray,maxLength){
	var tabRet=[];
	for(var i=0;i<maxLength;i++){
		if(!utils.allZeros(twoDimsArray,i)){
			tabRet.push(i);
		}
	}
	return tabRet;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Display functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Displays the jsonTabFolder
function displayJsonTabFolder(){
	
	var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
	infoText.textContent= "READY" ;
	infoText.style.color="lightgreen";
	infoText.onclick="";
	
	var warnList=document.getElementById('simple.03').shadowRoot.getElementById('Warning');
	var sizeList=document.getElementById('simple.03').shadowRoot.getElementById('Size');
	var modifyList=document.getElementById('simple.03').shadowRoot.getElementById('LastModified');
	var tagsList=document.getElementById('simple.03').shadowRoot.getElementById('Tags');
	var lib=document.getElementById('simple.03').shadowRoot.getElementById('mylib');

	while (lib.firstChild) {
		lib.removeChild(lib.firstChild);
	}
	while (warnList.firstChild) {
		warnList.removeChild(warnList.firstChild);
	}
	while (sizeList.firstChild) {
		sizeList.removeChild(sizeList.firstChild);
	}
	while (modifyList.firstChild) {
		modifyList.removeChild(modifyList.firstChild);
	}
	while (tagsList.firstChild) {
		tagsList.removeChild(tagsList.firstChild);
	}
	
	for(var i=0; i<jsonTabFolder.TypePath.length; i++){
		var nouveau_li = document.createElement('li');
		var nomdossier = document.createTextNode(jsonTabFolder.TypePath[i].name);
		nouveau_li.appendChild(nomdossier);
		lib.appendChild(nouveau_li);
		nouveau_li.setAttribute("title", jsonTabFolder.TypePath[i].path);
		if(jsonTabFolder.TypePath[i].type == "NOT FOUND" || jsonTabFolder.TypePath[i].type == "NOK"){
			var liWarn = document.createElement('li');
			var warn = document.createTextNode(jsonTabFolder.TypePath[i].type);
			liWarn.appendChild(warn);
			warnList.appendChild(liWarn);
			liWarn.setAttribute("title", "This path is either not a study, or missing key components");
			
			var liSize = document.createElement('li');
			var size = document.createTextNode(jsonTabFolder.TypePath[i].size);
			liSize.appendChild(size);
			sizeList.appendChild(liSize);
		
			var liModif = document.createElement('li');
			var modif = document.createTextNode(jsonTabFolder.TypePath[i].mdif);
			liModif.appendChild(modif);
			modifyList.appendChild(liModif);
			
			var liTag = document.createElement('li');
			var listTagsHoriz = document.createElement('ul');
			var liTag1 = document.createElement('li');
			var liTag2 = document.createElement('li');
			var liTag3 = document.createElement('li');
			
			var tag1 = document.createTextNode(jsonTabFolder.TypePath[i].tag1);
			liTag1.appendChild(tag1);
			var tag2 = document.createTextNode(jsonTabFolder.TypePath[i].tag2);
			liTag2.appendChild(tag2);
			var tag3 = document.createTextNode(jsonTabFolder.TypePath[i].tag3);
			liTag3.appendChild(tag3);
			
			if(jsonTabFolder.TypePath[i].tag1!=""){
				listTagsHoriz.appendChild(liTag1);
			}
			if(jsonTabFolder.TypePath[i].tag2!=""){
				listTagsHoriz.appendChild(liTag2);
			}
			if(jsonTabFolder.TypePath[i].tag3!=""){
				listTagsHoriz.appendChild(liTag3);
			}
			liTag1.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag1);
			liTag2.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag2);
			liTag3.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag3);
			listTagsHoriz.setAttribute('class','TagList');
			tagsList.appendChild(liTag);
			
			
		}
		else{// Everything is ok, proceed normally
			nouveau_li.onclick=(function(val){ return function(){
					remote.getGlobal('sharedObj').globalPath=jsonTabFolder.TypePath[val].path;
					Editor.Ipc.sendToPanel('simple.02','receivePath');
					Editor.Panel.focus('simple.02');
				}
			})(i);
			var liWarn = document.createElement('li');
			var warn = document.createTextNode(jsonTabFolder.TypePath[i].type);
			liWarn.appendChild(warn);
			warnList.appendChild(liWarn);
			
			var liSize = document.createElement('li');
			var size = document.createTextNode(common.formatBytes(jsonTabFolder.TypePath[i].size,3));
			liSize.appendChild(size);
			sizeList.appendChild(liSize);
		
			var liModif = document.createElement('li');
			var modif = document.createTextNode(utils.toJSONLocal(jsonTabFolder.TypePath[i].mdif));
			liModif.appendChild(modif);
			modifyList.appendChild(liModif);
			
			var liTag = document.createElement('li');
			var listTagsHoriz = document.createElement('ul');
			var liTag1 = document.createElement('li');
			var liTag2 = document.createElement('li');
			var liTag3 = document.createElement('li');
			
			var tag1 = document.createTextNode(jsonTabFolder.TypePath[i].tag1);
			liTag1.appendChild(tag1);
			liTag1.onclick=(function(){ 
				var tag=jsonTabFolder.TypePath[i].tag1;
				return function(){
					selectTag(tag);
				}
			})();
			var tag2 = document.createTextNode(jsonTabFolder.TypePath[i].tag2);
			liTag2.appendChild(tag2);
			liTag2.onclick=(function(){ 
				var tag=jsonTabFolder.TypePath[i].tag2;
				return function(){
					selectTag(tag);
				}
			})();
			var tag3 = document.createTextNode(jsonTabFolder.TypePath[i].tag3);
			liTag3.appendChild(tag3);
			liTag3.onclick=(function(){ 
				var tag=jsonTabFolder.TypePath[i].tag3;
				return function(){
					selectTag(tag);
				}
			})();
			
			liTag.appendChild(listTagsHoriz);
			if(jsonTabFolder.TypePath[i].tag1!=""){
				listTagsHoriz.appendChild(liTag1);
			}
			if(jsonTabFolder.TypePath[i].tag2!=""){
				listTagsHoriz.appendChild(liTag2);
			}
			if(jsonTabFolder.TypePath[i].tag3!=""){
				listTagsHoriz.appendChild(liTag3);
			}
			listTagsHoriz.setAttribute('class','TagList');
			liTag1.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag1);
			liTag2.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag2);
			liTag3.setAttribute('class',"c"+jsonTabFolder.TypePath[i].tag3);
			tagsList.appendChild(liTag);
		}
	}
	refreshBoxes();
	if(tagSelected){
		var tabSelected=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName("c"+tagSelected);	
		for(var i=0;i<tabSelected.length;i++){
			tabSelected[i].classList.add("tagSelected");
		}
	}
}

// Recursive function for file system exploration which recognize antares studies and archives and registers them
function recursiveSearch(pathFolder, level ){
	var items=fs.readdirSync(pathFolder);
	for (var i=0; i<items.length; i++) {
		var subPath=path.join(pathFolder, items[i]);
		var isdir=false;
		try{
			isdir=fs.statSync(subPath).isDirectory();
		}
		catch(err) {//do nothing
		}
		
		if(isdir){
			try{
				var studyPath=isAntaresStudy(subPath);
				var folderPath=utils.isAdoFolder(subPath);
				if( studyPath){
					var tabTag=utils.readTag(studyPath,loggerActions);
					if(tabTag.length<3){
						tabTag.push("");
						tabTag.push("");
						tabTag.push("");
					}
					jsonTabFolder.TypePath.push({	"type": "study",
											"name": studyPath.match(/([^\\|\/]*)\/*$/)[1],
											"path": studyPath,
											"size": getFolderSizeSync(studyPath),
											"mdif": readModifDate(studyPath),
											"tag1": tabTag[0],
											"tag2": tabTag[1],
											"tag3": tabTag[2]
					});
				}
				else if(folderPath){
					jsonTabFolder.TypePath.push({	"type": "chest",
											"name": folderPath.match(/([^\\|\/]*)\/*$/)[1],
											"path": folderPath,
											"size": getFolderSizeSync(folderPath),
											"mdif": fs.statSync(folderPath).mtime,
											"tag1": "",
											"tag2": "",
											"tag3": ""
					});
				}
				else if (level >0){
					recursiveSearch(subPath, level-1 );
				}
			}
			catch(err) {//do nothing
			}
		}
		else if(utils.isArchive(subPath)){
			var tabTag=utils.getTagsFromAntar(subPath,password,loggerActions,loggerExec);
			if(tabTag.length<3){
						tabTag.push("");
						tabTag.push("");
						tabTag.push("");
			}
			jsonTabFolder.TypePath.push({	"type": "archive",
									"name": subPath.match(/([^\\|\/]*)\/*$/)[1],
									"path": subPath,
									"size": getFolderSizeSync(subPath),
									"mdif": fs.statSync(subPath).mtime,
									"tag1": tabTag[0],
									"tag2": tabTag[1],
									"tag3": tabTag[2]
			});
		}
		else if(utils.isAblob(subPath)){
			jsonTabFolder.TypePath.push({	"type": "pack",
									"name": subPath.match(/([^\\|\/]*)\/*$/)[1],
									"path": subPath,
									"size": getFolderSizeSync(subPath),
									"mdif": fs.statSync(subPath).mtime,
									"tag1": "",
									"tag2": "",
									"tag3": ""
			});
		}
	}
}

//Adds a line in arrayCheck with the informations from arrayIsActivated
function addCheckArray(arrayCheck, arrayIsActivated){
	if(arrayIsActivated.length==arrayCheck.length){
		for (var indiceCheck = 0; indiceCheck < arrayCheck.length; indiceCheck++) {
			if(arrayIsActivated[indiceCheck]){
				addCheckBox(arrayCheck[indiceCheck]);
			}
			else{
				addDisabledCheckBox(arrayCheck[indiceCheck]);
			}
		}
	}
	else loggerActions.info("Wrong array of activation");
}

// Refreshes the displayed paths for all files
function displayPaths(){
	var dispMain=document.getElementById('simple.03').shadowRoot.getElementById('destMainDisp');
	var dispFolder=document.getElementById('simple.03').shadowRoot.getElementById('destFolderDisp');
	var dispScat=document.getElementById('simple.03').shadowRoot.getElementById('destScatDisp');
	var dispAcat=document.getElementById('simple.03').shadowRoot.getElementById('destAcatDisp');
	if(pathMain!=""){
		dispMain.textContent=pathMain.match(/([^\\|\/]*)\/*$/)[1];
		dispMain.setAttribute("title", pathMain);
	}
	if(destFolder!=""){
		dispFolder.textContent=destFolder.match(/([^\\|\/]*)\/*$/)[1];
		dispFolder.setAttribute("title", destFolder);
	}
	else{
		dispFolder.textContent="Unselected : each item will be archived or expanded in its own parent folder";
		dispFolder.setAttribute("title", "Unselected");
	}
	if(destScat!=""){
		dispScat.textContent=destScat.match(/([^\\|\/]*)\/*$/)[1];
		dispScat.setAttribute("title", destScat);
	}
	else{
		dispScat.textContent="None";
		dispScat.setAttribute("title", "None");
	}
	if(destAcat!=""){
		dispAcat.textContent=destAcat.match(/([^\\|\/]*)\/*$/)[1];
		dispAcat.setAttribute("title", destAcat);
	}
	else{
		dispAcat.textContent="None";
		dispAcat.setAttribute("title", "None");
	}
}

//regenerates the boxes lists
function refreshBoxes(){
	var typePath=getTypePath();
	var showList=document.getElementById('simple.03').shadowRoot.getElementById('Show');
	var registerList=document.getElementById('simple.03').shadowRoot.getElementById('Register');
	var unregisterList=document.getElementById('simple.03').shadowRoot.getElementById('Unregister');
	var trimList=document.getElementById('simple.03').shadowRoot.getElementById('Trim');
	var copyList=document.getElementById('simple.03').shadowRoot.getElementById('Copy');
	var archiveList=document.getElementById('simple.03').shadowRoot.getElementById('Archive');
	var expandList=document.getElementById('simple.03').shadowRoot.getElementById('Expand');
	var deleteList=document.getElementById('simple.03').shadowRoot.getElementById('Delete');
	var arrayCheck = [showList,registerList,unregisterList,trimList,copyList,archiveList,expandList,deleteList];
	
	var showTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleShow');
	var registerTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleRegister');
	var unregisterTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleUnregister');
	var trimTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleTrim');
	var copyTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleCopy');
	var expandTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleExpand');
	var archiveTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleArchive');
	var deleteTitle=document.getElementById('simple.03').shadowRoot.getElementById('TitleDelete');
	var arrayTitle=[showTitle,registerTitle,unregisterTitle,trimTitle,copyTitle,archiveTitle,expandTitle,deleteTitle];
	
	displayPaths();
	for (var indiceCheck = 0; indiceCheck < arrayCheck.length; indiceCheck++) {
		while (arrayCheck[indiceCheck].firstChild) {
			arrayCheck[indiceCheck].removeChild(arrayCheck[indiceCheck].firstChild);
		}
		arrayTitle[indiceCheck].firstChild.onclick=(function(){
			var list=arrayCheck[indiceCheck];
			return function() {
						utils.tickUntickAll(list)
					}
			}
		)();
	}
	if(typePath=="dir"){
		for(var i=0; i<jsonTabFolder.TypePath.length; i++){
			addCheckArray(arrayCheck,[1,//show
				((jsonTabFolder.TypePath[i].type=="archive" || jsonTabFolder.TypePath[i].type=="pack") && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked)||((jsonTabFolder.TypePath[i].type=="study" || jsonTabFolder.TypePath[i].type=="chest") && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked),//register
				0,//unregister
				jsonTabFolder.TypePath[i].type=="study",//trim
				document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked,//copy
				jsonTabFolder.TypePath[i].type=="study" || jsonTabFolder.TypePath[i].type=="chest",//archive
				jsonTabFolder.TypePath[i].type=="archive" || jsonTabFolder.TypePath[i].type=="pack",//expand
				1]);//delete
		}
	}
	if(typePath=="scat"){
		for(var i=0; i<jsonTabFolder.TypePath.length; i++){
			if(fs.existsSync(jsonTabFolder.TypePath[i].path)){
				addCheckArray(arrayCheck,[1,document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked,1,jsonTabFolder.TypePath[i].type=="study",document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked/*copy*/,1,0,1]);
			}
			else{
				addCheckArray(arrayCheck,[0,0,1,0,0,0,0,0]);
			}
		}
	}
	if(typePath=="acat"){
		for(var i=0; i<jsonTabFolder.TypePath.length; i++){
			if(fs.existsSync(jsonTabFolder.TypePath[i].path)){
				addCheckArray(arrayCheck,[1,document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked,1,0,document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked/*copy*/,0,1,1]);
			}
			else{
				addCheckArray(arrayCheck,[0,0,1,0,0,0,0,0]);
			}
		}
	}
	countAndDisplay();
}

// Displays the selected chest on the info line
function afficherFolder(sync){
	jsonTabFolder = {TypePath:[]};
	tagSelected="";
	resetType();
	var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
	infoText.textContent= "PLEASE WAIT (Searching portfolio for studies and archives)" ;
	infoText.onclick="";
	infoText.style.color="orange";
	if (sync){
		searchAndDisplayFolder();
	}
	else{
		setTimeout(function () {
			searchAndDisplayFolder();
			}
		,100);
	}
}

// Displays the selected acat file
function afficherAcat(){
	JsonLib = JSON.parse(fs.readFileSync(pathMain, 'utf8'));
	jsonTabFolder = {TypePath:[]};
	tagSelected="";
	resetType();
	//var jsonContent = JSON.parse(lib);
	
	
	var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
	for(var i=0;i<tabArrow.length;i++){
		tabArrow[i].innerHTML="&#x21D5";
		tabArrow[i].style.color="#bdbdbd";
	}
	if (typeof(JsonLib["libArray"])!="undefined"){
		for(var i=0; i<JsonLib.libArray.length; i++){
			if(fs.existsSync(JsonLib.libArray[i])){
				if(utils.isArchive(JsonLib.libArray[i])){
					var tabTag=utils.getTagsFromAntar(JsonLib.libArray[i],password,loggerActions,loggerExec);
					if(tabTag.length<3){
						tabTag.push("");
						tabTag.push("");
						tabTag.push("");
					}
					jsonTabFolder.TypePath.push({	"type": "archive",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": getFolderSizeSync(JsonLib.libArray[i]),
									"mdif": fs.statSync(JsonLib.libArray[i]).mtime,
									"tag1": tabTag[0],
									"tag2": tabTag[1],
									"tag3": tabTag[2]
					});
				}
				else if(utils.isAblob(JsonLib.libArray[i])){
					jsonTabFolder.TypePath.push({	"type": "pack",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": getFolderSizeSync(JsonLib.libArray[i]),
									"mdif": fs.statSync(JsonLib.libArray[i]).mtime,
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
				}
				else{
					jsonTabFolder.TypePath.push({	"type": "NOK",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": "NA",
									"mdif": "NA",
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
				}
			}
			else{
				jsonTabFolder.TypePath.push({	"type": "NOT FOUND",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": "NA",
									"mdif": "NA",
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
			}
		}
	}
	else {
		window.alert("Json file not correct");
	}
	displayJsonTabFolder();
}

// Displays the selected scat file
function afficherScat(){
	JsonLib = JSON.parse(fs.readFileSync(pathMain, 'utf8'));
	jsonTabFolder = {TypePath:[]};
	tagSelected="";
	resetType();
	
	var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
	for(var i=0;i<tabArrow.length;i++){
		tabArrow[i].innerHTML="&#x21D5";
		tabArrow[i].style.color="#bdbdbd";
	}
	
	if (typeof(JsonLib["libArray"])!="undefined"){
		for(var i=0; i<JsonLib.libArray.length; i++){
			if(fs.existsSync(JsonLib.libArray[i])){
				var result=isAntaresStudy(JsonLib.libArray[i]);
				if(result){
					if(!(result===JsonLib.libArray[i])){
						JsonLib.libArray[i]=result;
						fs.writeFileSync(pathMain, JSON.stringify(JsonLib) , 'utf-8');
					}
					var tabTag=utils.readTag(JsonLib.libArray[i],loggerActions);
					if(tabTag.length<3){
						tabTag.push("");
						tabTag.push("");
						tabTag.push("");
					}
					jsonTabFolder.TypePath.push({	"type": "study",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": getFolderSizeSync(JsonLib.libArray[i]),
									"mdif": fs.statSync(JsonLib.libArray[i]).mtime,
									"tag1": tabTag[0],
									"tag2": tabTag[1],
									"tag3": tabTag[2]
					});
				}
				else if(utils.isAdoFolder(JsonLib.libArray[i])){
					jsonTabFolder.TypePath.push({	"type": "chest",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": getFolderSizeSync(JsonLib.libArray[i]),
									"mdif": fs.statSync(JsonLib.libArray[i]).mtime,
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
				}
				else{
					jsonTabFolder.TypePath.push({	"type": "NOK",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": "NA",
									"mdif": "NA",
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
				}
			}
			else{
				jsonTabFolder.TypePath.push({	"type": "NOT FOUND",
									"name": JsonLib.libArray[i].match(/([^\\|\/]*)\/*$/)[1],
									"path": JsonLib.libArray[i],
									"size": "NA",
									"mdif": "NA",
									"tag1": "",
									"tag2": "",
									"tag3": ""
					});
			}
		}
	}
	else {
		window.alert("Json file not correct");
	}
	displayJsonTabFolder();
}

// Displays the selected path, sync is an optional variable that is only used in afficherFolder to tell him to be synchronous or not
function afficher(sync) {
	if(styleTagDefined==false && jsonTag && jsonTag.tags && jsonTag.tags.length>0){
		styleTagDefined=true;
		for(var i=0;i<jsonTag.tags.length;i++){
			if(jsonTag.tags[i].tagName){
				var style = document.createElement( 'style' );
				style.innerHTML = 'ul.TagList li.'+"c"+jsonTag.tags[i].tagName + ':before { border-right: 5px solid ' +jsonTag.tags[i].tagColor+ '; } ul.TagList li.'+"c"+jsonTag.tags[i].tagName + ' { background-color:' +jsonTag.tags[i].tagColor+ '; }';
				document.getElementById('simple.03').shadowRoot.appendChild(style);
			}
		}
	}
	
	displayPaths();
	if(pathMain){
		var typePath=getTypePath();
		if(typePath=="scat"){
			var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
			infoText.textContent= "PLEASE WAIT (Searching scat for studies)" ;
			infoText.onclick="";
			infoText.style.color="orange";
			if(sync){
				afficherScat();
			}
			else{
				setTimeout(function () {afficherScat()},50);
			}
		}
		else if(typePath=="acat"){
			var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
			infoText.textContent= "PLEASE WAIT (Searching acat for archives)" ;
			infoText.onclick="";
			infoText.style.color="orange";
			if(sync){
				afficherAcat();
			}
			else{
				setTimeout(function () {afficherAcat()},50);
			}
		}
		else if(typePath=="dir"){
			afficherFolder(sync);
		}
	}
	countAndDisplay();
}

//Refreshes the total line
function countAndDisplay(){
	var showList=document.getElementById('simple.03').shadowRoot.getElementById('Show');
	var registerList=document.getElementById('simple.03').shadowRoot.getElementById('Register');
	var unregisterList=document.getElementById('simple.03').shadowRoot.getElementById('Unregister');
	var trimList=document.getElementById('simple.03').shadowRoot.getElementById('Trim');
	var copyList=document.getElementById('simple.03').shadowRoot.getElementById('Copy');
	var archiveList=document.getElementById('simple.03').shadowRoot.getElementById('Archive');
	var expandList=document.getElementById('simple.03').shadowRoot.getElementById('Expand');
	var deleteList=document.getElementById('simple.03').shadowRoot.getElementById('Delete');
	
	var arrayCheck = [showList,registerList,unregisterList,trimList,copyList,archiveList,expandList,deleteList];
	var arrayTotal=["totalShow","totalRegister","totalUnregister","totalTrim","totalCopy","totalArchive","totalExpand","totalDelete"];
	
	for (var indiceCheck = 0; indiceCheck < arrayCheck.length; indiceCheck++) {
		var tot=0;
		for (var indiceList = 0; indiceList < arrayCheck[indiceCheck].childElementCount; indiceList++){
			if (arrayCheck[indiceCheck].children[indiceList].firstChild.checked){
				tot++;
			}
		}
		document.getElementById('simple.03').shadowRoot.getElementById(arrayTotal[indiceCheck]).innerHTML=tot;
	}
}

//Refreshes the total line to 0
function razTotalLine(){

	var arrayTotal=["totalShow","totalRegister","totalUnregister","totalTrim","totalCopy","totalArchive","totalExpand","totalDelete"];
	
	for (var indiceCheck = 0; indiceCheck < arrayTotal.length; indiceCheck++) {
		document.getElementById('simple.03').shadowRoot.getElementById(arrayTotal[indiceCheck]).innerHTML=0;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Utility functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Verify if the catalog provided is valid
function isValidLib(pathLib){
	var JsonLibTest;
	try{
		JsonLibTest = JSON.parse(fs.readFileSync(pathLib, 'utf8'));
	}
	catch(err) {
		loggerExec.debug("Error : " +err + " inside isValidLib");
		loggerActions.info("Problem with the lib file");
		return false;
	}
	if(JsonLibTest["libArray"]!="undefined" && JsonLibTest["libArray"] instanceof Array){
		return true;
	}
}

// Analyses if the path is a folder, a .scat or a .acat
function getTypePath(){
	if(pathMain){
		if(path.extname(pathMain)==='.scat'){
			return 'scat';
		}
		else if(path.extname(pathMain)==='.acat'){
			return 'acat';
		}
		else{
			var isdir=false;
			try{
				isdir=fs.statSync(pathMain).isDirectory();
			}
			catch(err) {//do nothing
			}
			if(isdir)
			{
				return 'dir';
			}
			else{
				return 0;
			}
		}
	}
	else{
		return 0;
	}
}

//Creates checkable checkbox in the provided list
function addCheckBox(list){
	var liCheck = document.createElement('li');
	var cb = document.createElement('input');
	cb.type = 'checkbox';
	liCheck.appendChild(cb);
	list.appendChild(liCheck);
}

//Add a title to the list
function addTitle(list,title){
	var li_titre = document.createElement('li');
	var titre = document.createElement('h3');
	titre.appendChild(document.createTextNode(title));
	li_titre.appendChild(titre);
	list.appendChild(li_titre);
}

//Creates uncheckable checkbox in the provided list
function addDisabledCheckBox(list){
	var liCheck = document.createElement('li');
	var cb = document.createElement('input');
	cb.type = 'checkbox';
	liCheck.appendChild(cb);
	list.appendChild(liCheck);
	cb.disabled=true;
}

//creates new logger
function createLoggerExec(){
	var tzoffset = (new Date()).getTimezoneOffset() * 60000;
	if(process.platform=="win32"){
		logExecPath=path.join(path.join(process.env.LOCALAPPDATA,"rte/antares_Data_Organizer"),"log_execution_"+new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,'')+".txt");
	}
	else if(process.platform=="linux"){
		logExecPath=path.join(path.join(process.env.HOME,"rte/antares_Data_Organizer"),"log_execution_"+new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,'')+".txt");
	}
	if(appLevel=='debug'){
		loggerExec = new (winston.Logger)({
		transports: [
		  new (winston.transports.Console)(),
		  new (winston.transports.File)({ 
			filename: logExecPath,
			json: false,
			formatter: utils.customFileFormatter,
			level: 'debug'
		  })
		]
		});
	}
	else{
		loggerExec = new (winston.Logger)({
			transports: [
			  new (winston.transports.Console)(),
			  new (winston.transports.File)({ 
				filename: logExecPath,
				json: false,
				formatter: utils.customFileFormatter,
				level: 'verbose'
			  })
			]
		});
	}
	if(tzoffset>0){
		loggerExec.verbose("The dates are formated to the local timezone. To convert them to UTC, add " + tzoffset/60000 + " minutes");
	}
	else{
		loggerExec.verbose("The dates are formated to the local timezone. To convert them in UTC, remove " + (-tzoffset/60000) + " minutes");
	}
	loggerExec.debug("Debug logs enabled\r\n");
}

//Look at a path and determine if it is an antares study or not
function isAntaresStudy(pathFolder){
	var result=0;
	var newpath;
	try{
		if(fs.isDirectorySync(pathFolder)){
			var items=fs.readdirSync(pathFolder);
			if(items.length==1)// If contains only one directory, we check if the directory is a study
			{
				var isSubdir=false;
					newpath=path.join(pathFolder, items[0]);
					isSubdir=fs.statSync(newpath).isDirectory();
					/*var itemsInside=fs.readdirSync(newpath);
					for (var i=0; i<itemsInside.length; i++) {
						if (itemsInside[i]==="study.antares"){
							result=newpath;
						}
					}*/
					if(fs.existsSync(path.join(newpath,"study.antares")) && fs.existsSync(path.join(newpath,"input")) && fs.existsSync(path.join(newpath,"settings")) && fs.existsSync(path.join(newpath,"Desktop.ini"))){
						var fileContent = fs.readFileSync(path.join(newpath,"study.antares"), 'utf8');
						if(fileContent.includes("author") && fileContent.includes("version") && fileContent.includes("caption") && fileContent.includes("created") &&fileContent.includes("lastsave")){
							result=newpath;
						}
					}
				
			}
			else
			{
				if(fs.existsSync(path.join(pathFolder,"study.antares")) && fs.existsSync(path.join(pathFolder,"input")) && fs.existsSync(path.join(pathFolder,"settings")) && fs.existsSync(path.join(pathFolder,"Desktop.ini"))){
						var fileContent = fs.readFileSync(path.join(pathFolder,"study.antares"), 'utf8');
						if(fileContent.includes("author") && fileContent.includes("version") && fileContent.includes("caption") && fileContent.includes("created") &&fileContent.includes("lastsave")){
							result=pathFolder;
						}
				}
			}
		}
	}
	catch(err) {//do nothing
	}
	return result;
}

//get the size of a folder
function getFolderSizeSync(pathSize){
	try{
		var size = fsUtils.fsizeSync(pathSize);
		if(size){
			return size;
		}
		else return 0;
	}
	catch(err){
		loggerExec.debug("Error : " +err + " into getFolderSizeSync");
		return "Error";
	}
}

//Reads date from study/sudy.antares and returns it as a string YYY-MM-DD or "Not found" if not found
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
		loggerExec.debug("Error : " +err + " into readModifDate");
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
		loggerExec.debug("Error : " +err + " into readName");
		return "Error";
	}
}

//get text formated string from archive
function getLinesFromAntar(pathArchive){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathArchive +'" "*'+ path.join(path.join(utils.getExtNameFromAntar(pathArchive,password,loggerActions,loggerExec),"settings"),"comments.txt")+'" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);
		return utils.getLinesFromXml(stringFile);
	}
	catch(err){
		loggerExec.debug(err + " inside getLinesFromAntar");
		return utils.getLinesFromXml("");
	}
}

//Reads data from study/sudy.antares and returns it a a string YYY-MM-DD or "Not found" if not found
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
		loggerActions.debug(err + " inside readModifDate");
		return "Error";
	}
}

//Get the size of a folder and displays it if the pathMain has not changed
/*function getFolderSizeAsync(path, pathOrigMain, childNumber){
	du(path, function (err,size) {
		if(pathOrigMain==pathMain){
			var sizeList=document.getElementById('simple.03').shadowRoot.getElementById('Size');
			if(sizeList.children[childNumber]){
				sizeList.children[childNumber].innerHTML=common.formatBytes(size,3);
			}
		}
	})
}*/

//Checks if the hash of the uncompressed study and the hash stored in the archive are the same
function checkHashDest(archivePath,studyPath){
	try{
		var hashStudy=utils.getHashStudy(studyPath, loggerExec);
		var hashFile=utils.getHashFromAntar(archivePath,password,loggerActions,loggerExec);
		if(hashStudy!="error" && hashFile===hashStudy){
			return "OK";
		}
		else {
			loggerExec.debug("Hashstudy : "+ hashStudy + " hashFile : " + hashFile);
			return "error";
		}
	}
	catch(err){
		loggerExec.debug(err + " inside checkHashDest");
		return "error";
	}
}

//Checks if the hash of the uncompressed study and the hash stored in the archive are the same
function checkCopyHash(copyPath,studyPath){
	try{
		var hashStudy=utils.getHashStudy(studyPath,loggerExec);
		var hashCopy=utils.getHashStudy(copyPath,loggerExec);
		if(hashStudy!="error" && hashStudy==hashCopy){
			return "OK";
		}
		else return 0;
	}
	catch(err){
		loggerExec.debug(err +" inside checkCopyHash");
		return 0;
	}
}

//returns OK of archive is ok, 0 if not
function isArchiveOk(pathArchive){
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" t "'+pathArchive +'" -p' + password;
	try{
		var stringFile=execSync(cmd);

		var line = stringFile.toString().match("Everything is Ok" );
		if(line){
			return "OK";
		}
		else return 0;
	}
	catch(err){
		loggerExec.debug(err + " inside isArchiveOk");
		return 0;
	}
}

//displays only the studies and archives with the selected tag
function selectTag(tag){
	if(tagSelected==""){
		tagSelected=tag;
		if(dispType=="all"){
			jsonTabFolderSave=jsonTabFolder;
			jsonTabFolder = {TypePath:[]};
			for(var i in jsonTabFolderSave.TypePath){
				if(jsonTabFolderSave.TypePath[i].tag1==tag || jsonTabFolderSave.TypePath[i].tag2==tag || jsonTabFolderSave.TypePath[i].tag3==tag){
					jsonTabFolder.TypePath.push(jsonTabFolderSave.TypePath[i]);
				}
			}
		}
		else{
			var jsonTabFolderTemp=jsonTabFolder;
			jsonTabFolder = {TypePath:[]};
			for(var i in jsonTabFolderTemp.TypePath){
				if(jsonTabFolderTemp.TypePath[i].tag1==tag || jsonTabFolderTemp.TypePath[i].tag2==tag || jsonTabFolderTemp.TypePath[i].tag3==tag){
					jsonTabFolder.TypePath.push(jsonTabFolderTemp.TypePath[i]);
				}
			}
		}
	}
	else{
		var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');//no longer sorted 
		for(var i=0;i<tabArrow.length;i++){
			tabArrow[i].innerHTML="&#x21D5";
			tabArrow[i].style.color="#bdbdbd";
		}
		if(tagSelected!=tag){
			tagSelected=tag; 
			jsonTabFolder = {TypePath:[]};
			for(var i in jsonTabFolderSave.TypePath){
				if(jsonTabFolderSave.TypePath[i].tag1==tag || jsonTabFolderSave.TypePath[i].tag2==tag || jsonTabFolderSave.TypePath[i].tag3==tag){
					jsonTabFolder.TypePath.push(jsonTabFolderSave.TypePath[i]);
				}
			}
		}
		else{
			tagSelected="";
			jsonTabFolder=jsonTabFolderSave;
		}
		if(dispType!="all"){
			var jsonTabFolderTemp=jsonTabFolder;
			jsonTabFolder = {TypePath:[]};
			if(dispType=="sf"){
				for(var i in jsonTabFolderTemp.TypePath){
					if(jsonTabFolderTemp.TypePath[i].type=="study" || jsonTabFolderTemp.TypePath[i].type=="folder"){
							jsonTabFolder.TypePath.push(jsonTabFolderTemp.TypePath[i]);
					}
				}
			}
			else if(dispType=="aa"){
				for(var i in jsonTabFolderTemp.TypePath){
					if(jsonTabFolderTemp.TypePath[i].type=="archive" || jsonTabFolderTemp.TypePath[i].type=="pack"){
							jsonTabFolder.TypePath.push(jsonTabFolderTemp.TypePath[i]);
					}
				}
			}
		}
	}
	displayJsonTabFolder();
}

//returns OK of archive is ok, 0 if not
function resetType(){
	var radioButtons=document.getElementById('simple.03').shadowRoot.getElementById('selectType');
	radioButtons.children[0].checked=true;
	dispType="all";
}

Editor.Panel.extend({
style: `
	h1 {
		color: #999;
	}
	p.destDisp{
		position:absolute;
		top:0px;
		margin-top:0px;
		font-size: 1.17em;
		left:240px;
		width:500px;
	}
	h3.destSelect {
		margin-top:0px;
		position:absolute;
		top:0px;
		width:370px;
		margin-left:30px;
	}
	#display{
		position:relative;
		top:-10px;
		left:3px;
		
	}
	#destFolder{
		position:absolute;
		top:30px;
		left:3px;
	}
	#destScat{
		position:absolute;
		top:50px;
		left:3px;
	}
	#destAcat{
		position:absolute;
		top:70px;
		left:3px;
	}
	#destMainDisp{
		top:20px;
	}
	li {
		height:26px;
		list-style-type:none;
	}
	ul {
		padding-left:0px; 
		margin-top:-25px;
		width: 70px;
		text-align:center;
	}
	#mylib{
		width:200px;
	}
		ul.checkbox li{
		text-align:center;
	}
	
	ul.TagList {
		padding-left:0px; 
		width: 180px;
		text-align:center;
		margin-top: 0px;
		
	}
	ul.liblist li{
		text-align:left;
		white-space: nowrap; /* forces text to single line */
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tagSelected{
		border: 1px solid white;
		border-left: 6px solid white;
	}
	ul.TagList li{
		display: inline-block;
		top:0px;
		background-color:red;
		margin-right: 5px;
		margin-left: 5px;
		height:18px;
		padding-right:2px;
		color:black;
		line-height: 17px;
	}
	ul.TagList li:before { 
		top:0px;
		content:""; 
		position: absolute; 
		right: 100%; 
		width: 0; 
		height: 0; 
		border-top: 9px solid transparent; 
		border-right: 5px solid red; 
		border-bottom: 9px solid transparent; 
	}
	div.listcheck{
		overflow-x:auto; 
		overflow-y:visible; 
		height:auto;
		width:100%;
		max-width:1190px;
		display: flex;
		position:absolute;
		left:3px;
		top: 140px;
		bottom: 0;
		margin-top: 0px;
		margin-right:5px;
		bottom:32px;
		background-image: repeating-linear-gradient( 180deg, #474747, #474747 26px, #555555 26px, #555555 52px );
		background-attachment:local;
		background-position-y:-4px;
	}
	li{
		position: relative;
		top:25px;
	}
	button.exec{
		position : absolute;
		bottom:3px;
		height:20px;
		left:5px;
	}
	button.exec{
		position : absolute;
		bottom:5px;
		height:20px;
		left:5px;
	}
	button.cancel{
		position : absolute;
		bottom:5px;
		height:20px;
		left:210px;
	}
	div.title{
		position : absolute;
		top:90px;
		width:70px;
	}
	div.title h3{
		text-align:center;
	}
	#TitleStudyName{
		left:3px;
		width:200px;
	}
	#TitleStudyName h3{
		text-align:left;
	}
	#TitleWarning{
		left:203px;
	}
	#TitleSize{
		left:273px;
	}
	#TitleLastModified{
		left:343px;
	}
	#TitleShow{
		left:413px;
	}
	#TitleRegister{
		left:483px;
	}
	#TitleUnregister{
		left:553px;
	}
	#TitleTrim{
		left:623px;
	}
	#TitleCopy{
		left:693px;
	}
	#TitleArchive{
		left:763px;
		width:70;
	}
	#TitleExpand{
		left:833px;
		width:70;
	}
	#TitleDelete{
		left:903px;
		width:70;
	}
	#TitleTags{
		left:973px;
		width:70;
	}
	#infos{
		position : fixed;
		bottom:14px;
		height:7px;
		left:275px;
		text-overflow: clip;
		width:900px;
	}
	#checkDelay{
		position : absolute;
		bottom:3px;
		left:75px;
	}
	#delay{
		position : absolute;
		bottom:5px;
		height:7px;
		left:100px;
	}
	#hours{
		position : absolute;
		bottom:5px;
		height:20px;
		left:140px;
		width:20px;
	}
	#minutes{
		position : absolute;
		bottom:5px;
		height:20px;
		left:170px;
		width:20px;
	}
	#texth{
		position : absolute;
		bottom:5px;
		height:7px;
		left:161px;
	}
	#textm{
		position : absolute;
		bottom:5px;
		height:7px;
		left:192px;
	}
	input[type="number"]::-webkit-outer-spin-button,
	input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	#total{
		position:absolute;
		top:123px;
		width:1185px;
		right:0px;
		background-color:grey;
		height:15px;
		left:0px;
	}
	#total p{
		position:absolute;
		margin-top:0;
		margin-bottom:0;
		top:0px;
	}
	#totalShow{
		left:445px;
	}
	#totalRegister{
		left:515px;
	}
	#totalUnregister{
		left:585px;
	}
	#totalTrim{
		left:655px;
	}
	#totalCopy{
		left:725px;
	}
	#totalArchive{
		left:795px;
	}
	#totalExpand{
		left:865px;
	}
	#totalDelete{
		left:935px;
	}
	#bottomdiv{
		position:absolute;
		height:30px;
		bottom:0px;
		background-color:grey;
		width:1185px;
		left:0px;
		
	}
	#selectType{
		position:absolute;
		right:0px;
		display: flex;
	}
	#selectRatio{
		position:absolute;
		right:1px;
		display: flex;
		top:20px;
	}
	#slidecontainer{
		position:absolute;
		right:5px;
		top : 28px;
		height: 1px;
	}
	#rDepth{
		position:relative;
		top : -4px;
	}
	input[type=range] {
	  -webkit-appearance: none;
	  width: 150px;
	  margin: 6.5px 0;
	}
	input[type=range]:focus {
	  outline: none;
	}
	input[type=range]::-webkit-slider-runnable-track {
	  width: 100%;
	  height: 3px;
	  cursor: pointer;
	  box-shadow: 0.5px 0.5px 8.4px #000000, 0px 0px 0.5px #0d0d0d;
	  background: #ffffff;
	  border-radius: 23.3px;
	  border: 0.3px solid #010101;
	}
	input[type=range]::-webkit-slider-thumb {
	  box-shadow: 0.3px 0.3px 1px #000000, 0px 0px 0.3px #0d0d0d;
	  border: 0.5px solid #000000;
	  height: 16px;
	  width: 5px;
	  border-radius: 23px;
	  background: #ffffff;
	  cursor: pointer;
	  -webkit-appearance: none;
	  margin-top: -6.8px;
	}
	input[type=range]:focus::-webkit-slider-runnable-track {
	  background: #ffffff;
	}
	input[type=range]::-moz-range-track {
	  width: 100%;
	  height: 3px;
	  cursor: pointer;
	  box-shadow: 0.5px 0.5px 8.4px #000000, 0px 0px 0.5px #0d0d0d;
	  background: #ffffff;
	  border-radius: 23.3px;
	  border: 0.3px solid #010101;
	}
	input[type=range]::-moz-range-thumb {
	  box-shadow: 0.3px 0.3px 1px #000000, 0px 0px 0.3px #0d0d0d;
	  border: 0.5px solid #000000;
	  height: 16px;
	  width: 5px;
	  border-radius: 23px;
	  background: #ffffff;
	  cursor: pointer;
	}
	input[type=range]::-ms-track {
	  width: 100%;
	  height: 3px;
	  cursor: pointer;
	  background: transparent;
	  border-color: transparent;
	  color: transparent;
	}
	input[type=range]::-ms-fill-lower {
	  background: #ffffff;
	  border: 0.3px solid #010101;
	  border-radius: 46.6px;
	  box-shadow: 0.5px 0.5px 8.4px #000000, 0px 0px 0.5px #0d0d0d;
	}
	input[type=range]::-ms-fill-upper {
	  background: #ffffff;
	  border: 0.3px solid #010101;
	  border-radius: 46.6px;
	  box-shadow: 0.5px 0.5px 8.4px #000000, 0px 0px 0.5px #0d0d0d;
	}
	input[type=range]::-ms-thumb {
	  box-shadow: 0.3px 0.3px 1px #000000, 0px 0px 0.3px #0d0d0d;
	  border: 0.5px solid #000000;
	  height: 16px;
	  width: 5px;
	  border-radius: 23px;
	  background: #ffffff;
	  cursor: pointer;
	  height: 3px;
	}
	input[type=range]:focus::-ms-fill-lower {
	  background: #ffffff;
	}
	input[type=range]:focus::-ms-fill-upper {
	  background: #ffffff;
	}

	`,

template: `
	<style> @import "./general.css"; </style>
	<div style="width=100%;height:100%;display: flex;" id="maindiv">
	<form id="selectType" onClick="Editor.Ipc.sendToPanel('simple.03','changeType')">
		<input type="radio" name="dispType" value="all" checked>All
		<input type="radio" name="dispType" value="sf">Studies and chests
		<input type="radio" name="dispType" value="aa">Archives and packs
	</form>
	<form id="selectRatio" onClick="Editor.Ipc.sendToPanel('simple.03','changeRatio')">
		<legend>Compression algorythm :</legend>
		<input type="radio" name="ratio" value="speed" checked>Speed
		<input type="radio" name="ratio" value="comp">Compression Ratio
	</form></p>
	<div id="slidecontainer">
		<p>Research depth : 0 <input type="range" min="0" max="50" value="10" id="rDepth" onchange="Editor.Ipc.sendToPanel('simple.03','changeDepth')"> 50</p>
	</div>
	<Div id="display"><h2>Origin <u onClick="Editor.Ipc.sendToPanel('simple.03','openMainFolder')">portfolio</u> or <u onClick="Editor.Ipc.sendToPanel('simple.03','openlib')">catalog</u> :</h2><p class="destDisp" id="destMainDisp">Undefined</p></Div>
	<Div id="destFolder" title="Ticking or clicking on 'destination folder' opens a windows for folder selection. When ticked, the result of a compression, an expansion or a copy will go to the selected folder. When unticked, copy is impossible and the result of a compression or an expansion will go to the path of the archive or study on which the operation is done."><input type="checkbox" id="destFolderCheck" onClick="Editor.Ipc.sendToPanel('simple.03','checkFolder')"><div  onClick="Editor.Ipc.sendToPanel('simple.03','openFolder')" ><h3 class="destSelect">Destination folder :</h3><p class="destDisp" id="destFolderDisp">Unselected : each item will be archived or expanded in its own parent folder </p></Div></Div>
	<Div id="destScat" title="Ticking or clicking on 'destination scat' opens a windows for file selection. When ticked, expanding an archive or copying a study will automatically register the resulting study in this catalog. It also unlocks the 'register' option for studies contained in the main catalog or portfolio."><input type="checkbox" id="destScatCheck" onClick="Editor.Ipc.sendToPanel('simple.03','checkScat')"><div  onClick="Editor.Ipc.sendToPanel('simple.03','openScat')"><h3 class="destSelect">Destination scat :</h3><p class="destDisp" id="destScatDisp">None</p></Div></Div>
	<Div id="destAcat" title="Ticking or clicking on 'destination acat' opens a windows for file selection. When ticked, archiving a study or copying an archive will automatically register the resulting archive in this catalog. It also unlocks the 'register' option for archives contained in the main catalog or portfolio."><input type="checkbox" id="destAcatCheck" onClick="Editor.Ipc.sendToPanel('simple.03','checkAcat')"><div  onClick="Editor.Ipc.sendToPanel('simple.03','openAcat')"><h3 class="destSelect">Destination acat :</h3><p class="destDisp" id="destAcatDisp">None</p></Div></Div>
	<div id="TitleStudyName" class="title" onClick="Editor.Ipc.sendToPanel('simple.03','sortByName')"><h3><span class="arrow">&#x21D5</span> Study/Archive Name</h3></div>
	<div id="TitleWarning" class="title" title="Portfolio origin : displays if the item is a study or an archive&#013;Catalog origin : displays if the item is missing, corrupted or OK" onClick="Editor.Ipc.sendToPanel('simple.03','sortByType')"><h3><span class="arrow">&#x21D5</span> Status</h3></div>
	<div id="TitleSize" class="title" title="Displays Item Size" onClick="Editor.Ipc.sendToPanel('simple.03','sortBySize')"><h3><span class="arrow">&#x21D5</span> Size</h3></div>
	<div id="TitleLastModified" class="title" title="Study : diplays date of last Antares save&#013;Archive: displays date of archive creation" onClick="Editor.Ipc.sendToPanel('simple.03','sortByDate')"><h3><span class="arrow">&#x21D5</span> Modif.</h3></div>
	
	<div id="TitleShow" class="title" title="Prints digest info into log folder&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Show</h3></div>
	<div id="TitleRegister" class="title" title="Adds references in DESTINATION catalog&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Register</h3></div>
	<div id="TitleUnregister" class="title" title="Removes references from ORIGIN catalog&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Unregister</h3></div>
	<div id="TitleTrim" class="title" title=" Removes Output folders from studies&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Trim</h3></div>
	<div id="TitleCopy" class="title" title="Copies items to destination folder&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Copy</h3></div>
	<div id="TitleArchive" class="title" title="Archives studies into proper space&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Archive</h3></div>
	<div id="TitleExpand" class="title" title="Expands archive into proper space&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Expand</h3></div>
	<div id="TitleDelete" class="title" title="Deletes item and unregister from origin catalog (if any)&#013;Click column header to select all items" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')"><h3>Delete</h3></div>
	<div id="TitleTags" class="title" onClick="Editor.Ipc.sendToPanel('simple.03','sortByTags')"><h3><span class="arrow">&#x21D5</span> Tags</h3></div>
	<div id="total"><p>Total</p>
		<p id="totalShow">0</p>
		<p id="totalRegister">0</p>
		<p id="totalUnregister">0</p>
		<p id="totalTrim">0</p>
		<p id="totalCopy">0</p>
		<p id="totalArchive">0</p>
		<p id="totalExpand">0</p>
		<p id="totalDelete">0</p>
	</div>
	<div  class="flex-container listcheck">
	
		<ul id="mylib" class="flex-item liblist" >
		</ul>
		<ul id="Warning" class="flex-item" >
		</ul>
		<ul id="Size" class="flex-item" >
		</ul>
		<ul id="LastModified" class="flex-item" >
		</ul>
		<ul id="Show" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Register" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Unregister" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Trim" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Copy" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Archive" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Expand" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Delete" class="flex-item checkbox" onClick="Editor.Ipc.sendToPanel('simple.03','totalCount')">
		</ul>
		<ul id="Tags" class="flex-item">
		</ul>
	</div>
	<div id="bottomdiv">
		<button type="button" id="buttonExec" class="exec" onClick="Editor.Ipc.sendToPanel('simple.03','exec')">Execute</button> 
		<!-- <input type="checkbox" id="checkDelay"> -->
		<button type="button" id="buttonCancel" class="cancel" onClick="Editor.Ipc.sendToPanel('simple.03','cancel')" style="pointer-events:all;">Cancel</button> 
		<p id="delay">Delay :<\p>
		<input type="number" oninput="if(value.length>2)value=value.slice(0,2)" id="hours"/>
		<p id="texth">h<\p>
		<input type="number" oninput="if(value.length>2)value=value.slice(0,2)" id="minutes"/>
		<p id="infos">Please select origin workspace<\p>
		<p id="textm">m<\p>
	</div>
	</div>
	`,
listeners: {
	},
messages: {
		changeDepth(){
			researchDepth=document.getElementById('simple.03').shadowRoot.getElementById('rDepth').value;
		},
		changeType(){
			var radioButtons=document.getElementById('simple.03').shadowRoot.getElementById('selectType');
			var prevDispType=dispType;
			if(radioButtons.children[0].checked){
				dispType="all";
			}
			else if(radioButtons.children[1].checked){
				dispType="sf";
			}
			else if(radioButtons.children[2].checked){
				dispType="aa";
			}
			try{
				if(dispType!="all"){
					if(prevDispType!="all" || tagSelected){
						jsonTabFolder={TypePath:[]};
					}
					else{
						jsonTabFolderSave=jsonTabFolder;
						jsonTabFolder={TypePath:[]};
					}
					if(dispType=="sf"){
						for(var i in jsonTabFolderSave.TypePath){
							if(jsonTabFolderSave.TypePath[i].type=="study" || jsonTabFolderSave.TypePath[i].type=="chest"){
									jsonTabFolder.TypePath.push(jsonTabFolderSave.TypePath[i]);
							}
						}
					}
					else if(dispType=="aa"){
						for(var i in jsonTabFolderSave.TypePath){
							if(jsonTabFolderSave.TypePath[i].type=="archive" || jsonTabFolderSave.TypePath[i].type=="pack"){
									jsonTabFolder.TypePath.push(jsonTabFolderSave.TypePath[i]);
							}
						}
					}
				}
				else{
					if(prevDispType!="all" || tagSelected){
						jsonTabFolder=jsonTabFolderSave;
					}
				}
				if(tagSelected){
					var jsonTabTemp=jsonTabFolder;
					jsonTabFolder = {TypePath:[]};
					for(var i in jsonTabTemp.TypePath){
						if(jsonTabTemp.TypePath[i].tag1==tagSelected || jsonTabTemp.TypePath[i].tag2==tagSelected || jsonTabTemp.TypePath[i].tag3==tagSelected){
							jsonTabFolder.TypePath.push(jsonTabTemp.TypePath[i]);
						}
					}
	Editor.log("d:"+jsonTabFolder.TypePath.length);
				}
			}
			catch(err){
				//do nothing, probably changed before init
			}
			displayJsonTabFolder();
			
		},
		openFolder(){//opens destination folder
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{properties: [ 'openDirectory'],defaultPath: destFolderSave });
			if(getPath){
				destFolder=getPath[0];
				document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked=true;
				refreshBoxes();
				razTotalLine();
			}
			else{//do nothing
			}
		},
		checkFolder(){//checks destination folder
			if(destFolder=="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
				var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{properties: [ 'openDirectory'] ,defaultPath: destFolderSave});
				if(getPath){
					destFolder=getPath[0];
					refreshBoxes();
					razTotalLine();
				}
				else{
					document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked=false;
				}
			}
			else if(!document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
				destFolderSave=destFolder;
				destFolder="";
				refreshBoxes();
				razTotalLine();
			}
		},
		openScat(){
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{filters: [
				{ name: 'All Files', extensions: ['*'] },
				{ name: 'scat', extensions: ['scat'] }
				],
				properties: [ 'openFile'] ,defaultPath: destScatSave});
			if(getPath){
				if(isValidLib(getPath[0])){
					destScat=getPath[0];
					document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked=true;
					refreshBoxes();
					razTotalLine();
				}
				else { 
					window.alert("This catalog is corrupted");
				}
			}
		},
		checkScat(){
			if(destScat=="" && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
				var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{filters: [
					{ name: 'scat', extensions: ['scat'] }
					],
					properties: [ 'openFile'] ,defaultPath: destScatSave});
				if(getPath){
					if(isValidLib(getPath[0])){
						destScat=getPath[0];
						razTotalLine();
						refreshBoxes();
					}
					else { 
						window.alert("This catalog is corrupted");
						document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked=false;
					}
				}
				else{
					document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked=false;
				}
			}
			else if(!document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
				destScatSave=destScat;
				destScat="";
				razTotalLine();
				refreshBoxes();
			}
		},
		openAcat(){
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{filters: [
				{ name: 'acat', extensions: ['acat'] }
				],
				properties: [ 'openFile']  ,defaultPath: destScatSave});
			if(getPath){
				if(isValidLib(getPath[0])){
					destAcat=getPath[0];
					document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked=true;
				}
				else { 
					window.alert("This catalog is corrupted");
				}
				refreshBoxes();
				razTotalLine();
			}
		},
		checkAcat(){
			if(document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
				var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{filters: [
					{ name: 'acat', extensions: ['acat'] }
					],
					properties: [ 'openFile'],
				defaultPath: destAcatSave});
				if(getPath){
					if(isValidLib(getPath[0])){
						destAcat=getPath[0];
						refreshBoxes();
						razTotalLine();
					}
					else { 
						window.alert("This catalog is corrupted");
						document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked=false;
					}
				}
				else{
					document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked=false;
				}
			}
			else if(!document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
				destAcatSave=destAcat;
				destAcat="";
				refreshBoxes();
				razTotalLine();
			}
		},
		openlib(){
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{filters: [
				{ name: 'All', extensions: ['scat','acat'] },
				{ name: 'scat', extensions: ['scat'] },
				{ name: 'acat', extensions: ['acat'] }
				],
			properties: [ 'openFile'] });
			
			if(getPath){
				if(isValidLib(getPath[0])){
					pathMain=getPath[0];
					afficher();
					razTotalLine();
				}
				else { 
					window.alert("This catalog is corrupted");
				}
			}
		},
		openMainFolder(){
			var getPath=dialog.showOpenDialog(electron.remote.getCurrentWindow(),{
			properties: [ 'openDirectory'] });
			
			if(getPath){
				pathMain=getPath[0];
				afficher();
				razTotalLine();
			}
		},
		exec(){
			cancelAll=0;
			if (destScat=="" && document.getElementById('simple.03').shadowRoot.getElementById('destScatCheck').checked){
				window.alert("Please select a destination study catalog or uncheck the option");
			}
			else if(destAcat=="" && document.getElementById('simple.03').shadowRoot.getElementById('destAcatCheck').checked){
				window.alert("Please select a destination archive catalog or uncheck the option");
			
			}
			else if(destFolder=="" && document.getElementById('simple.03').shadowRoot.getElementById('destFolderCheck').checked){
				window.alert("Please select a destination folder or uncheck the option");
			}
			else{
				if(pathMain){
					var hours=0;
					var mins=0;
					var infoText=document.getElementById('simple.03').shadowRoot.getElementById('infos');
					hours=parseInt(document.getElementById('simple.03').shadowRoot.getElementById('hours').value);
					if(!hours || hours<0 || hours > 48){
						hours=0;
					}
					mins=parseInt(document.getElementById('simple.03').shadowRoot.getElementById('minutes').value);
					if(!mins || mins<0 || mins > 99){
						mins=0;
					}
					var totMinutes=mins+ 60*hours;
					var seconds=0;
					if(totMinutes){
						totMinutes--;
						seconds=59;
					}
					var typePath=getTypePath();
					if(typePath=="scat"){
						if(isValidLib(pathMain)){
							disableMain();
							waitExec(totMinutes,seconds,execScat);
						}
						else { 
							window.alert("The main catalog is corrupted");
						}
					}
					else if(typePath=="acat"){
						if(isValidLib(pathMain)){
							disableMain();
							waitExec(totMinutes,seconds,execAcat);
						}
						else { 
							window.alert("The main catalog is corrupted");
						}
					}
					else if(typePath=="dir"){
						disableMain();
						waitExec(totMinutes,seconds,execFolder);
					}
				}
			}
		},
		sortByName(){
			if(jsonTabFolder && jsonTabFolder.TypePath){
				jsonTabFolder.TypePath=jsonTabFolder.TypePath.sort(utils.sortByProperty('name',upDown));
				var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
				for(var i=0;i<tabArrow.length;i++){
					tabArrow[i].innerHTML="&#x21D5";
					tabArrow[i].style.color="#bdbdbd";
				}
				document.getElementById('simple.03').shadowRoot.getElementById('TitleStudyName').getElementsByClassName('arrow')[0].style.color="white";
				if(upDown=="up"){
					upDown="down";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleStudyName').getElementsByClassName('arrow')[0].innerHTML=("▼");
				}
				else{
					upDown="up";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleStudyName').getElementsByClassName('arrow')[0].innerHTML=("▲");
				}
				displayJsonTabFolder();
			}
			
		},
		sortByType(){
			if(jsonTabFolder && jsonTabFolder.TypePath){
				var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
				for(var i=0;i<tabArrow.length;i++){
					tabArrow[i].innerHTML="&#x21D5";
					tabArrow[i].style.color="#bdbdbd";
				}
				document.getElementById('simple.03').shadowRoot.getElementById('TitleWarning').getElementsByClassName('arrow')[0].style.color="white";
				jsonTabFolder.TypePath=jsonTabFolder.TypePath.sort(utils.sortByProperty('type',upDown));
				if(upDown=="up"){
					upDown="down";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleWarning').getElementsByClassName('arrow')[0].innerHTML=("▼");
				}
				else{
					upDown="up";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleWarning').getElementsByClassName('arrow')[0].innerHTML=("▲");
				}
				displayJsonTabFolder();
			}
			
		},
		sortBySize(){
			if(jsonTabFolder && jsonTabFolder.TypePath){
				jsonTabFolder.TypePath=jsonTabFolder.TypePath.sort(utils.sortByProperty('size',upDown));
				var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
				for(var i=0;i<tabArrow.length;i++){
					tabArrow[i].innerHTML="&#x21D5";
					tabArrow[i].style.color="#bdbdbd";
				}
				document.getElementById('simple.03').shadowRoot.getElementById('TitleSize').getElementsByClassName('arrow')[0].style.color="white";
				if(upDown=="up"){
					upDown="down";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleSize').getElementsByClassName('arrow')[0].innerHTML=("▲");
				}
				else{
					upDown="up";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleSize').getElementsByClassName('arrow')[0].innerHTML=("▼");
				}
				displayJsonTabFolder();
			}
			
		},
		sortByDate(){
			if(jsonTabFolder && jsonTabFolder.TypePath){
				jsonTabFolder.TypePath=jsonTabFolder.TypePath.sort(utils.sortByProperty('mdif',upDown));
				var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
				for(var i=0;i<tabArrow.length;i++){
					tabArrow[i].innerHTML="&#x21D5";
					tabArrow[i].style.color="#bdbdbd";
				}
				document.getElementById('simple.03').shadowRoot.getElementById('TitleLastModified').getElementsByClassName('arrow')[0].style.color="white";
				if(upDown=="up"){
					upDown="down";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleLastModified').getElementsByClassName('arrow')[0].innerHTML=("▼");
				}
				else{
					upDown="up";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleLastModified').getElementsByClassName('arrow')[0].innerHTML=("▲");
				}
				displayJsonTabFolder();
			}
			
		},
		sortByTags(){
			if(jsonTabFolder && jsonTabFolder.TypePath){
				jsonTabFolder.TypePath=jsonTabFolder.TypePath.sort(utils.sortByProperty('tag1',upDown));
				var tabArrow=document.getElementById('simple.03').shadowRoot.getElementById('maindiv').getElementsByClassName('arrow');
				for(var i=0;i<tabArrow.length;i++){
					tabArrow[i].innerHTML="&#x21D5";
					tabArrow[i].style.color="#bdbdbd";
				}
				document.getElementById('simple.03').shadowRoot.getElementById('TitleTags').getElementsByClassName('arrow')[0].style.color="white";
				if(upDown=="up"){
					upDown="down";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleTags').getElementsByClassName('arrow')[0].innerHTML=("▼");
				}
				else{
					upDown="up";
					document.getElementById('simple.03').shadowRoot.getElementById('TitleTags').getElementsByClassName('arrow')[0].innerHTML=("▲");
				}
				displayJsonTabFolder();
			}
			
		},
		cancel(){
			cancelAll=1;
		},
		totalCount(){
			countAndDisplay();
		},
		openHelp(){
			if(fs.existsSync(path.join(path.dirname(appPath),"resources", "data-organizer-reference-guide.pdf"))){
				
				shell.openItem(path.join(path.dirname(appPath),"resources", "data-organizer-reference-guide.pdf"));
			}
			else{
				shell.openItem(path.join(path.dirname(appPath), "data-organizer-reference-guide.pdf"));
			}
		},
		openTrouble(){
			
			if(fs.existsSync(path.join(path.dirname(appPath),"resources", "data-organizer-troubleshooting.pdf"))){
				shell.openItem(path.join(path.dirname(appPath),"resources", "data-organizer-troubleshooting.pdf"));
			}
			else{
				shell.openItem(path.join(path.dirname(appPath), "data-organizer-troubleshooting.pdf"));
			}
		},
		openLogFolder(){
			//exec("explorer.exe "+path.parse(logPath).dir);
			shell.openItem(path.parse(logPath).dir);
		},
		openLog(){
			if(fs.existsSync(logExecPath)){
				//exec("explorer.exe "+logExecPath);
				shell.openItem(logExecPath);
			}
			else alert("No log for current session");
		},
		refreshTag(){
			for(var i=0; i<jsonTabFolder.TypePath.length; i++){
				if(jsonTabFolder.TypePath[i].path==remote.getGlobal('sharedObj').globalPath){
					var tabTag=utils.readTag(remote.getGlobal('sharedObj').globalPath,loggerActions);
					if(tabTag.length<3){
						tabTag.push("");
						tabTag.push("");
						tabTag.push("");
					}
					jsonTabFolder.TypePath[i].tag1=tabTag[0];
					jsonTabFolder.TypePath[i].tag2=tabTag[1];
					jsonTabFolder.TypePath[i].tag3=tabTag[2];
				}
			}
			if(jsonTabFolderSave){
				for(var i=0; i<jsonTabFolderSave.TypePath.length; i++){
					if(jsonTabFolderSave.TypePath[i].path==remote.getGlobal('sharedObj').globalPath){
						var tabTag=utils.readTag(remote.getGlobal('sharedObj').globalPath,loggerActions);
						if(tabTag.length<3){
							tabTag.push("");
							tabTag.push("");
							tabTag.push("");
						}
						jsonTabFolderSave.TypePath[i].tag1=tabTag[0];
						jsonTabFolderSave.TypePath[i].tag2=tabTag[1];
						jsonTabFolderSave.TypePath[i].tag3=tabTag[2];
					}
				}
			}
			displayJsonTabFolder();
		},
		changeRatio(){
			var radioButtons=document.getElementById('simple.03').shadowRoot.getElementById('selectRatio');
			if(radioButtons.children[1].checked){
				archiveOpt=archiveOptSpeed;
			}
			else if(radioButtons.children[2].checked){
				archiveOpt=archiveOptSize;
			}
		}
	},
});


