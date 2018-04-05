var exports = module.exports = {};
const fs = require('fs-plus');
var path = require('path');
const child_process = require('child_process');
const execSync = require('child_process').execSync;
const electron = require('electron');
const remote = electron.remote;
const app = remote.app;
const appPath= app.getAppPath();

//get the 7z.exe path
exports.getSevenZip = function(appPath,logger){
	if(fs.existsSync(path.join(path.dirname(appPath), "7z.exe"))){
		return path.join(path.dirname(appPath), "7z.exe");
	}
	else if(fs.existsSync(path.join(path.dirname(appPath),"resources", "7z.exe"))){
		return path.join(path.dirname(appPath),"resources", "7z.exe");
	}
	else{
		logger.error("No sevenzip was found");
		return "";
	}
}


//Creates or overwrites a text file in temp with the provided name
exports.saveStringInTempFile = function(fileName,stringToSave){
	fs.writeFileSync(path.join(process.env.TMP,fileName), stringToSave);
}
