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

var exports = module.exports = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries and const used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-plus');
const path = require('path');
const child_process = require('child_process');
const execSync = require('child_process').execSync;
const electron = require('electron');
const remote = electron.remote;
const app = remote.app;
const appPath= app.getAppPath();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions to export
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

//checks the icon of a folder defined by desktop.ini
exports.checkIcon= function (pathChest)
{
	var pathIcon;
	if(fs.existsSync(path.join(path.dirname(appPath),"resources", "ado.ico"))){
		pathIcon=path.join(path.dirname(appPath),"resources", "ado.ico");
	}
	else if(fs.existsSync(path.join(path.dirname(appPath), "ado.ico"))){
		pathIcon=path.join(path.dirname(appPath), "ado.ico");
	}
	pathIni=path.join(pathChest,"Desktop.ini");
	if(!fs.isFileSync(pathIni)){
		fs.writeFileSync(pathIni,"[.shellclassinfo]\nIconResource = "+pathIcon+",0");
	}
	else
	{
		var pathLine;
		var classInfoLine=-1;
		var iconLine=-1;
		var modif=false;
		var lines=fs.readFileSync(pathIni, 'utf8').split(/[\r\n]+/);
		for(var i=0;i<lines.length;i++)
		{
			if(lines[i].startsWith("IconResource"))
			{
				var pathLine=lines[i].split("=")[1].split(",")[0];
				iconLine=i;
				if(!pathLine || !fs.existsSync(pathLine))
				{
					lines[i]="IconResource = "+pathIcon+",0";
					modif=true;
				}
				break;
			}
			else if(lines[i].startsWith("[.shellclassinfo]"))
			{
				classInfoLine=i;
			}
		}
		if(iconLine==-1)
		{
			modif=true;
			if(classInfoLine==-1)
			{
				lines[0]="[.shellclassinfo]\nIconResource = "+pathIcon+",0\n"+lines[0];
			}
			else
			{
				lines[classInfoLine]=lines[classInfoLine]+"\nIconResource = "+pathIcon+",0";
			}
		}
		else if(classInfoLine==-1)
		{
			modif=true;
			lines[iconLine]="[.shellclassinfo]\n"+lines[iconLine];
		}
		if(modif){
			var newFile="";
			for(var i=0;i<lines.length;i++)
			{
				newFile=newFile+lines[i]+"\n";
				try{
					fs.writeFileSync(pathIni,newFile);
				}
				catch(err)
				{
					//do nothing
				}
			}
		}
	}
	var cmd ='attrib +R +S "'+pathChest+'"';
	try{
		execSync(cmd);
	}
	catch(err)
	{
		//do nothing
	}
}

//deletes the icon of a folder defined by desktop.ini
exports.delIcon= function (pathChest)
{
	pathIni=path.join(pathChest,"Desktop.ini");
	if(fs.isFileSync(pathIni)){
		var modif=false;
		var lines=fs.readFileSync(pathIni, 'utf8').split(/[\r\n]+/);
		if(lines.length==3)
		{
			try{
				fs.unlinkSync(pathIni);
			}
			catch(err)
			{
				//do nothing
			}
		}
		else
		{
			var newFile="";
			for(var i=0;i<lines.length;i++)
			{
				if(!lines[i].startsWith("IconResource"))
				{
					newFile=newFile+lines[i]+"\n";
				}
				else{
					modif=true;
				}
			}
			if(modif==true)
			{
				try{
					fs.writeFileSync(pathIni,newFile);
				}
				catch(err)
				{
					//do nothing
				}
			}
		}
	}
}
