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
**
** This file incorporates work covered by the following copyright and  
** permission notice: 
****# License
****
****The MIT License (MIT)
****
****Copyright (c) 2015 - 2017 Rory Bradford and contributors.
****
****Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
****
****The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
****
****THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**
** This file also incorporates work covered by the following copyright and  
** permission notice: 
****# MIT License
****
****Copyright (c) 2014 Bryan Burgers
****
****Permission is hereby granted, free of charge, to any person obtaining a copy
****of this software and associated documentation files (the "Software"), to deal
****in the Software without restriction, including without limitation the rights
****to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
****copies of the Software, and to permit persons to whom the Software is
****furnished to do so, subject to the following conditions:
****
****The above copyright notice and this permission notice shall be included in all
****copies or substantial portions of the Software.
****
****THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
****IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
****FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
****AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
****LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
****OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
****SOFTWARE.
**
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Usefull declarations
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const BUFFER_SIZE = 8192
var exports = module.exports = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions to export
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Returns the sha1 hash of a file, even large
function sha1FileSync(filename) {
  const fd = fs.openSync(filename, 'r')
  const hash = crypto.createHash('sha1')
  const buffer = Buffer.alloc(BUFFER_SIZE)

  try {
    let bytesRead

    do {
      bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE)
      hash.update(buffer.slice(0, bytesRead))
    } while (bytesRead === BUFFER_SIZE)
  } finally {
    fs.closeSync(fd)
  }

  return hash.digest('hex')
}

function hashDirectorySync(filepath) {
	var files = fs.readdirSync(filepath);

	var directoryItems = files.map(function(file) {
		return hashDirectoryItemSync(path.join(filepath, file));
	});

	var buffers = [];

	directoryItems.sort(function(a, b) {
		return a.name > b.name;
	});

	directoryItems.forEach(function(di) {
		buffers.push(new Buffer(di.mode + " " + di.name + "\0", 'utf-8'));
		buffers.push(new Buffer(di.hash, 'hex'));
	});

	var buffer = Buffer.concat(buffers);

	var shasum = crypto.createHash('sha1');
	shasum.update('tree ' + buffer.length.toString() + '\0');
	shasum.update(buffer);

	var digest = shasum.digest('hex');

	return {
		type: 'tree',
		path: filepath,
		name: path.basename(filepath),
		hash: digest,
		mode: '40000'
	}
}

function hashFileSync(filepath, stats) {
	var shasum = crypto.createHash('sha1');
	var buffer = Buffer.alloc(BUFFER_SIZE)
	const fd = fs.openSync(filepath, 'r')
	// Use git's header.
	shasum.update('blob ' + stats.size + '\0');
	
	try {
		let bytesRead

		do {
			bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE)
			shasum.update(buffer.slice(0, bytesRead))
		} while (bytesRead === BUFFER_SIZE)
		} finally {
		fs.closeSync(fd)
	}
	
	// Read the file, and hash the results.
	
	shasum.update(buffer);

	// When the file is done, we have the complete shasum.
	var d = shasum.digest('hex');
	return {
		type: 'blob',
		path: filepath,
		name: path.basename(filepath),
		hash: d,
		mode: '100644'
	};
}

function hashDirectoryItemSync(filepath) {
	var stats = fs.statSync(filepath);

	if (stats.isDirectory()) {
		return hashDirectorySync(filepath);
	}
	else if (stats.isFile()) {
		return hashFileSync(filepath, stats);
	}
	else {
		throw new Error("Unsupported directory item type");
	}
}

module.exports.dir = hashDirectorySync;
module.exports.file = sha1FileSync;