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
**Copyright (c) 2015 Cocos Creator
**
**Permission is hereby granted, free of charge, to any person obtaining a copy
**of this software and associated documentation files (the "Software"), to deal
**in the Software without restriction, including without limitation the rights
**to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
**copies of the Software, and to permit persons to whom the Software is
**furnished to do so, subject to the following conditions:
**
**The above copyright notice and this permission notice shall be included in all
**copies or substantial portions of the Software.
**
**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
**IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
**FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
**AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
**LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
**OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
**SOFTWARE.
*/


'use strict';

const Electron = require('electron');
const EventEmitter = require('events');
const Path = require('fire-path');
const _ = require('lodash');

const app = Electron.app;
const events = new EventEmitter();

/**
 * The Editor.App is your app.js module. Read more details in
 * [Define your application](https://github.com/cocos-creator/editor-framework/blob/master/docs/manual/define-your-app.md).
 * @property App
 * @type object
 */
module.exports = {
  /**
   * The name of your app. It is defined in the `name` field in package.json
   * @property name
   * @type string
   */
  name: app.getName(),

  /**
   * your app version
   * @property version
   * @type string
   */
  version: app.getVersion(),

  /**
   * The current app.js running directory.
   * @property path
   * @type string
   */
  path: app.getAppPath(),

  /**
   * Your application's data path. Usually it is `~/.{your-app-name}`
   * @property home
   * @type string
   */
  home: Path.join(app.getPath('home'),'AppData','Local','rte', `.${app.getName()}`),

  /**
   * If application is focused
   * @property focused
   * @type boolean
   */
  focused: false,

  /**
   * Extends Editor.App
   * @property extend
   * @type function
   */
  extend ( proto ) {
    _.assign( this, proto );
  },

  on () {
    return events.on.apply(this,arguments);
  },

  off () {
    return events.removeListener.apply(this,arguments);
  },

  once () {
    return events.once.apply(this,arguments);
  },

  emit () {
    return events.emit.apply(this,arguments);
  },
};
