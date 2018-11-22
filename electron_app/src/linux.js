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

//checks the icon of a folder defined by desktop.ini
exports.checkIcon= function (pathChest)
{
	//Not supported on linux for now
}

//deletes the icon of a folder defined by desktop.ini
exports.delIcon= function (pathChest)
{
	//Not supported on linux for now
}
