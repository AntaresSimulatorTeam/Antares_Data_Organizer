var exports = module.exports = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-plus');
const path = require('path');
const child_process = require('child_process');
const execSync = require('child_process').execSync;
const electron = require('electron');
const remote = electron.remote;
const dialog= remote.dialog;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions to export
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//return 7za if it is visible on path, else shows an error box
exports.getSevenZip = function(appPath,logger){
	try{
		execSync("7za");
		return "7za";
	}
	catch(err){
		dialog.showErrorBox("Error", "7za is not in range. Please install it globally for Antares Data Organizer to function properly.");
		return "error";
	}
}

//Creates or overwrites a text file in temp with the provided name
exports.saveStringInTempFile = function(fileName,stringToSave){
	fs.writeFileSync(path.join("/tmp",fileName), stringToSave);
}
