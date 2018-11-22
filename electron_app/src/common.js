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
//Functions to export
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//inserts an   element after the refElem element
exports.insertAfter = function(elem, refElem) {
			var parent = refElem.parentNode
			var next = refElem.nextSibling
			if (next) {
				return parent.insertBefore(elem, next)
			} else {
				return parent.appendChild(elem)
			}
}

//return extension of  file
exports.getExt = function(filename){
	return filename.split('.').pop();
}


//Return a size in the proper unit and precision
exports.formatBytes = function(bytes,precision) {
   if(bytes == 0) return '0 Byte';
   var k = 1024; 
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toPrecision(precision)) + ' ' + sizes[i];
}

