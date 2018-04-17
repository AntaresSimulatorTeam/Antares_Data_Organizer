const fs = require('fs-plus');
const electron = require('electron');
const path = require('path');
const remote = electron.remote;
const app = remote.app;
const appPath= app.getAppPath();
const execSync = require('child_process').execSync;
var hashdirectory = require('hashdirectory');
global.rootRequire = function(name) {
	return require(app.getAppPath() + '/' + name);
}
var os;
if(process.platform=="win32"){
	os = rootRequire('src/windows.js');
}
if(process.platform=="linux"){
	os = rootRequire('src/linux.js');
}
var exports = module.exports = {};
var _this = this;

//Look at a path and determine if it is a compatible folder or not
exports.isAdoFolder = function(pathFolder){
	var result=0;
	var newpath;
	try{
		if(fs.isDirectorySync(pathFolder)){
			var items=fs.readdirSync(pathFolder);
			if(fs.existsSync(path.join(pathFolder,"info.ado"))){ 
				result=pathFolder;
			}
		}
	}
	catch(err) {//do nothing
	}
	return result;
}


//get hash from folder
exports.getHashStudy = function(studyPath,logger){
	try{
		if(fs.isDirectorySync(studyPath)){
			var hashed = hashdirectory.sync(studyPath);
			return hashed;
		}
		else{
			var hashed = fs.md5ForPath(studyPath);
			return hashed;
		}
	}
	catch(err){
		logger.debug(err + " inside getHashStudy");
		return "error";
	}
}

//sorts json array by property 
exports.sortByProperty = function (property, upDown) {
	if(upDown=="up"){
		return function (x, y) {
			return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? 1 : -1));

		};
	}
	else {
		return function (x, y) {
			return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? -1 : 1));

		};
	}
};


//Reads version from study/sudy.antares and returns it a a string x.x.x or "Not found" if not found
exports.readVersion = function(pathStudy){
	var fileContent = fs.readFileSync(path.join(pathStudy,"study.antares"), 'utf8');
	var line = fileContent.match("version.{0,3}[0-9]*" );
	var version=line[0].match("[0-9]{1,}")[0];
	if(version.length>=3){
		return version[0]+"."+version[1]+"."+version[2];
	}
	else return "Not found";
}

//gets hash from the .hash file inside an archive
exports.getHashFromAntar = function(archivePath,password,loggerActions,loggerExec){
	try{
		var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+archivePath +'" "*'+exports.getExtNameFromAntar(archivePath,password,loggerActions,loggerExec)+'.hash" -r -so -p' + password;
		return execSync(cmd).toString();
	}
	catch(err){
		if(loggerExec){
			loggerExec.debug(err + " inside getHashFromAntar");
		}
		else{
			loggerActions.debug(err + " inside getHashFromAntar");
		}
		return "error";
	}
}

//Reads version from archive study/sudy.antares and returns it a a string x.x.x or "Not found" if not found
exports.readVersionAntar = function(pathArchive,password,loggerActions,loggerExec){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathArchive +'" "*'+path.join(exports.getExtNameFromAntar(pathArchive,password,loggerActions,loggerExec),"study.antares")+'" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);
		var line = stringFile.toString().match("version.{0,3}[0-9]*" );
		var version=line[0].match("[0-9]{1,}")[0];
		if(version.length>=3){
			return version[0]+"."+version[1]+"."+version[2];
		}
		else{
			return "Not found";
		}
	}
	catch(err){
		if(loggerExec){
			loggerExec.debug(err + " inside readVersionAntar");
		}
		return "Not found";
	}
}

//Reads tags from study/sudy.antares and returns it as a tab of strings
exports.readTag = function(pathStudy,logger){
	var tab=[];
	try{
		var fileContent = fs.readFileSync(path.join(pathStudy,"study.antares"), 'utf8');
		var cont=true;
		var ind = 1;
		while(cont && ind<11){
			var line = fileContent.match('tag_'+(("0" + ind).slice(-2))+".*");
			if(line && line[0]){
				try{
					var res=line[0].split("=")[1].trim();
					if(res.length>7){
						res=res.slice(0,7);
					}
					if(res.length>0){
						tab.push(res);	
					}
				}
				catch(err){
					cont=false;
					logger.debug("Error : " +err + " into readTag");
				}
			}
			else{
				cont=false;
			}
			ind++;
		}
		return tab;
	}
	catch(err){
		logger.debug("Error : " +err + " into readTag");
		return [];
	}
}

//gets the name of the study from an archive path
exports.getExtNameFromAntar = function(pathArchive,password,loggerActions,loggerExec){
	return exports.getMetaFromAntar(pathArchive,"ExtrName",password,loggerActions,loggerExec);
}

//gets the tags of the study from an archive path
exports.getTagsFromAntar = function(pathArchive,password,loggerActions,loggerExec){
	var tab=[];
	var cont=true;
	var ind = 1;
	while(cont && ind<11){
		var tag = exports.getMetaFromAntar(pathArchive,"TagNb_"+(("0" + ind).slice(-2)),password,loggerActions,loggerExec);
		if(tag=="0"|| tag=="-"|| tag=="Error"){
			cont=false;
		}
		else{
			tab.push(tag);
		}
		ind++;
	}
	return tab;
}

function verifTag(tag){
	if(tag=="0" || tag=="-"|| tag=="Error"){
		return "";
	}
	if(tag.length>7){
		return tag.slice(0,7);
	}
	else return tag;
}

//gets the required metric from an archive path
exports.getMetaFromAntar = function(pathArchive,metric,password,loggerActions,loggerExec/*0 or logger*/){
	
	var cmd ='"'+os.getSevenZip(appPath, loggerActions)+'" e "'+pathArchive +'" "*.para" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);

		var line = stringFile.toString().match("\\[+"+metric+"\\].*" );
		if(!line){
			return "-";
		}
		else{
			var name=line[0].split("]")[1];
			if(name){
				return name;
			}
			else return "0";
		}
	}
	catch(err){
		if(loggerExec){
			loggerExec.debug(err + " inside getMetaFromAntar for " + metric);
		}
		return "Error";
	}
}

// Parse date
exports.toJSONLocal = function(date) {
    var local = new Date(date);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
}

//verifies that a line of a two dimensions array is all zeroes
exports.allZeros = function(twoDimsArray,indice){
	var res=0;
	for(var i=0;i<twoDimsArray.length;i++){
		res+=twoDimsArray[i][indice];
	}
	return res==0;
}

//Creates two dimentional array of zeros
exports.zeros = function(dimensions) { //zeros([length,height])
    var array = [];

    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : exports.zeros(dimensions.slice(1)));
    }

    return array;
}

//used in the logger
exports.customFileFormatter = function(args) {
    // Return string will be passed to logger.
    if(args.level!='verbose'){
		var tzoffset = (new Date()).getTimezoneOffset() * 60000;
		return "["+ new Date(Date.now() - tzoffset).toISOString().replace(/T/, ' ').replace(/\..+/, '')+"][antares_Data_Organizer]["+args.level+"]"+args.message;
	}
	else return args.message;
}

//returns a string of at least "length" characters, with zeroes on the left
exports.leftPad = function(str, length){
    str = str == null ? '' : String(str);
    length = ~~length;
    var pad = '';
    var padLength = length - str.length;
    while(padLength-- && padLength>-1) {
        pad += '0';
    }
    return pad + str;
}

//checks if a path is an archive
exports.isArchive = function(pathArchive){
	if(path.extname(pathArchive)==='.antar'){
		try{
			fs.statSync(pathArchive);
		  }catch(err){
			if(err.code == 'ENOENT') return false;
		  }
		return true;
	}
	return false;
}

//checks if a path is an ablob
exports.isAblob = function(pathArchive){
	if(path.extname(pathArchive)==='.ablob'){
		try{
			fs.statSync(pathArchive);
		  }catch(err){
			if(err.code == 'ENOENT') return false;
		  }
		return true;
	}
	return false;
}

//Check all active boxes in a list if any of them is unchecked, else unchecks them
exports.tickUntickAll = function(list){
	var allchecked=true;
	for(var i=0; i<list.childNodes.length;i++){
		if ( !list.childNodes[i].childNodes[0].disabled && !list.childNodes[i].childNodes[0].checked){//if the box is unchecked and activated
			allchecked=false;
		}
	}
	for(i=0; i<list.childNodes.length;i++){
		if ( !list.childNodes[i].childNodes[0].disabled){
			list.childNodes[i].childNodes[0].checked=!allchecked;
		}
	}
}

exports.getLinesFromAblob = function(pathArchive,logger,password){
	var cmd ='"'+os.getSevenZip(appPath, logger)+'" e "'+pathArchive +'" "*'+ path.join(exports.getExtNameFromAntar(pathArchive,password,logger,0),"info.ado")+'" -r -so -p' + password;
	try{
		var stringFile=execSync(cmd);
		return stringFile;
	}
	catch(err){
		return "Error";
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//XML / HTML Utils
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//takes the adress from an xml file and returns html
exports.getHtmlFromXmlFile = function(pathFile){
	var stringFile=fs.readFileSync(pathFile, 'utf8');
	return exports.getHtmlFromXml(stringFile);
}

//change an xml string to html
exports.getHtmlFromXml = function(stringFile){
	var domparser = new DOMParser();
	var xmlTree = domparser.parseFromString(stringFile,"text/xml");
	var ret="";
	
	for(var i=0;i<xmlTree.getElementsByTagName("paragraph").length;i++){
		var bulletlist=false;
		if((xmlTree.getElementsByTagName("paragraph")[i].attributes["liststyle"] && xmlTree.getElementsByTagName("paragraph")[i].attributes["liststyle"].nodeValue=="Bullet List") && (xmlTree.getElementsByTagName("paragraph")[i].attributes["leftindent"] && xmlTree.getElementsByTagName("paragraph")[i].attributes["leftindent"].nodeValue>1)){
			bulletlist=true;
			ret+="<ul style=\"list-style-type:disc\"><li>";
		}
		
		var paragraph=xmlTree.getElementsByTagName("paragraph")[i];
		for(var y=0; y<paragraph.children.length; y++){
			if(paragraph.children[y].tagName=="text"){
				var bold=false;
				var italic=false;
				var underlined=false;
				if(paragraph.children[y].attributes["fontweight"] && paragraph.children[y].attributes["fontweight"].nodeValue=="92"){
					bold=true;
					ret+="<b>";
				}
				if(paragraph.children[y].attributes["fontstyle"] && paragraph.children[y].attributes["fontstyle"].nodeValue=="93"){
					italic=true;
					ret+="<i>";
				}
				if(paragraph.children[y].attributes["fontunderlined"] && paragraph.children[y].attributes["fontunderlined"].nodeValue=="1"){
					underlined=true;
					ret+="<u>";
				}
				ret+=paragraph.children[y].innerHTML.replace(/"/g,"");
				if(underlined){
					ret+="</u>";
				}
				if(italic){
					ret+="</i>";
				}
				if(bold){
					ret+="</b>";
				}
			}
			else if(paragraph.children[y].tagName=="symbol"){
				ret+=String.fromCharCode(paragraph.children[y].innerHTML);
			}
		}
		ret=ret.replace(/	/g, "&emsp;");
	
		if(bulletlist){
			ret+="</li></ul>";
		}
		else{
			ret+="</br>";
		}
	}
	return ret;
}

//get text formated string from xml file
exports.getLinesFromXmlFile = function(pathFile){
	var stringFile=fs.readFileSync(pathFile, 'utf8');
	return exports.getLinesFromXml(stringFile);
}


//get text formated string from xml string
exports.getLinesFromXml = function(stringFile){
	var domparser = new DOMParser();
	var xmlTree = domparser.parseFromString(stringFile,"text/xml");
	var ret="";
	
	for(var i=0;i<xmlTree.getElementsByTagName("paragraph").length;i++){
		var paragraph=xmlTree.getElementsByTagName("paragraph")[i];
		ret+="\r\n[textLine]";
		for(var y=0; y<paragraph.children.length; y++){
			
			if(paragraph.children[y].tagName=="text"){
				ret+=paragraph.children[y].innerHTML.replace(/"/g,"");
			}
			else if(paragraph.children[y].tagName=="symbol"){
				ret+=String.fromCharCode(paragraph.children[y].innerHTML);
			}
		}
	}
	return ret.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&apos;/g, '\'');;
}


