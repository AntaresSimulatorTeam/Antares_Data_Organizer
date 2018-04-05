var exports = module.exports = {};
const fs = require('fs-plus');
var path = require('path');
const child_process = require('child_process');
const execSync = require('child_process').execSync;

//get the 7z.exe path
exports.getSevenZip = function(appPath,logger){
	return "7za";
}

//get hash using 7zip exe
exports.getHashStudy = function(studyPath,logger){
	
	var cmd ='shasum "'+studyPath +'"';

	try{
		var stringCmd=execSync(cmd).toString();
		if(!stringCmd){//if there is no result
			return "error";
		}
		var crc=stringCmd.split(" ")[0];
		logger.debug("Hash from " + studyPath +" : " +crc);
		if(crc){
			return crc;
		}
		else return "error";
	}
	catch(err){
		logger.debug(err + " inside getHashStudy");
		return "error";
	}
}

//Creates or overwrites a text file in temp with the provided name
exports.saveStringInTempFile = function(fileName,stringToSave){
	fs.writeFileSync(path.join("/tmp",fileName), stringToSave);
}
