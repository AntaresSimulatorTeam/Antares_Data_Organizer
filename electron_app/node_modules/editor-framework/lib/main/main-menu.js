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

/**
 * The main menu module for manipulating main menu items
 * @module MainMenu
 */
let MainMenu = {};
module.exports = MainMenu;

// requires
const Electron = require('electron');

const Ipc = require('./ipc');
const Window = require('./window');
const Menu = require('./menu');
const Debugger = require('./debugger');
const i18n = require('./i18n');
const Platform = require('../share/platform');

const _T = i18n.t;
let _mainMenu;

// ========================================
// exports
// ========================================

/**
 * Init main menu
 * @method init
 */
MainMenu.init = function () {
  if ( !_mainMenu ) {
    _mainMenu = new Menu(_builtinMainMenu());
  }

  let menuTmpl = Menu.getMenu('main-menu');
  if ( !menuTmpl ) {
    Menu.register('main-menu', _builtinMainMenu);
    menuTmpl = Menu.getMenu('main-menu');
  }

  _mainMenu.reset(menuTmpl);
  MainMenu.apply();
};

/**
 * Apply main menu changes
 * @method apply
 */
MainMenu.apply = function () {
  Electron.Menu.setApplicationMenu(_mainMenu.nativeMenu);
};

/**
 * Build a template into menu item and add it to path
 * @method add
 * @param {string} path - A menu path
 * @param {object[]|object} template
 */
MainMenu.add = function ( path, template ) {
  if ( _mainMenu.add( path, template ) ) {
    MainMenu.apply();
  }
};

/**
 * Build a template into menu item and add it to path
 * @method add
 * @param {string} path - A menu path
 * @param {object[]|object} template
 */
MainMenu.update = function ( path, template ) {
  if ( _mainMenu.update( path, template ) ) {
    MainMenu.apply();
  }
};

/**
 * Remove menu item at path.
 * @method remove
 * @param {string} path - A menu path
 */
MainMenu.remove = function ( path ) {
  if ( _mainMenu.remove( path ) ) {
    MainMenu.apply();
  }
};

/**
 * Revert to builtin main-menu
 * @method _resetToBuiltin
 */
MainMenu._resetToBuiltin = function () {
  Menu.register('main-menu', _builtinMainMenu, true);
  MainMenu.init();
};

/**
 * Set menu options at path.
 * @method set
 * @param {string} path - A menu path
 * @param {object} [options]
 * @param {NativeImage} [options.icon] - A [NativeImage](https://github.com/atom/electron/blob/master/docs/api/native-image.md)
 * @param {Boolean} [options.enabled]
 * @param {Boolean} [options.visible]
 * @param {Boolean} [options.checked] - NOTE: You must set your menu-item type to 'checkbox' to make it work
 */
MainMenu.set = function ( path, options ) {
  if ( _mainMenu.set( path, options ) ) {
    MainMenu.apply();
  }
};

/**
 * Get main menu instance for debug purpose
 * @property menu
 */
Object.defineProperty(MainMenu, 'menu', {
  enumerable: true,
  get () { return _mainMenu; },
});

// ========================================
// Internal
// ========================================

function _builtinMainMenu () {
  return [
    // Help
    {
      label: _T('MAIN_MENU.help.title'),
      role: 'help',
      id: 'help',
      submenu: [
        {
          label: _T('MAIN_MENU.help.docs'),
          click () {
            // TODO
            // let helpWin = require('../../share/manual');
            // helpWin.openManual();
          }
        },
        {
          label: _T('MAIN_MENU.help.api'),
          click () {
            // TODO
            // let helpWin = require('../../share/manual');
            // helpWin.openAPI();
          }
        },
        {
          label: _T('MAIN_MENU.help.forum'),
          click () {
            // TODO
            // Shell.openExternal('http://cocos-creator.com/chat');
            // Shell.beep();
          }
        },
        { type: 'separator' },
        {
          label: _T('MAIN_MENU.help.subscribe'),
          click () {
            // TODO
            // Shell.openExternal('http://eepurl.com/bh5w3z');
            // Shell.beep();
          }
        },
        { type: 'separator' },
      ]
    },

    // editor-framework
    {
      label: _T('SHARED.product_name'),
      position: 'before=help',
      submenu: [
        /*{
          label: _T('MAIN_MENU.about', {
            product: _T('SHARED.product_name')
          }),
          role: 'about',
        },
        {
          label: _T('MAIN_MENU.window.hide', {
            product: _T('SHARED.product_name')
          }),
          accelerator: 'CmdOrCtrl+H',
          role: 'hide'
        },
        {
          label: _T('MAIN_MENU.window.hide_others'),
          accelerator: 'CmdOrCtrl+Shift+H',
          role: 'hideothers'
        },
        {
          label: _T('MAIN_MENU.window.show_all'),
          role: 'unhide'
        },
        { type: 'separator' },*/
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click () {
            Window.main.close();
          }
        },
      ]
    },

    // Edit
    {
      label: _T('MAIN_MENU.edit.title'),
      submenu: [
        {
          label: _T('MAIN_MENU.edit.undo'),
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: _T('MAIN_MENU.edit.redo'),
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: _T('MAIN_MENU.edit.cut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: _T('MAIN_MENU.edit.copy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: _T('MAIN_MENU.edit.paste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: _T('MAIN_MENU.edit.selectall'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
      ]
    },

    // Window
    {
      label: 'Window',
      id: 'window',
      role: 'window',
      submenu: [
        {
          label: _T('MAIN_MENU.window.hide', {product: _T('SHARED.product_name')}),
          accelerator: 'CmdOrCtrl+H',
          visible: Platform.isDarwin,
          role: 'hide'
        },
        {
          label: _T('MAIN_MENU.window.hide_others'),
          accelerator: 'CmdOrCtrl+Shift+H',
          visible: Platform.isDarwin,
          role: 'hideothers'
        },
        {
          label: _T('MAIN_MENU.window.show_all'),
          role: 'unhide',
          visible: Platform.isDarwin
        },
        {
          label: _T('MAIN_MENU.window.minimize'),
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: _T('MAIN_MENU.window.bring_all_front'),
          visible: Platform.isDarwin,
          role: 'front',
        },
        { type: 'separator' },
        {
          label: _T('MAIN_MENU.window.close'),
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ]
    },

    // Panel
    {
      label: 'Panel',
      id: 'panel',
      submenu: [
      ]
    },

    // Layout
    {
      label: _T('MAIN_MENU.layout.title'),
      id: 'layout',
      submenu: [
        {
          label: _T('MAIN_MENU.layout.default'),
          click () {
            let layoutInfo = require(Window.defaultLayout);
            Ipc.sendToMainWin( 'editor:reset-layout', layoutInfo);
          }
        },
        {
          label: _T('MAIN_MENU.layout.empty'),
          dev: true,
          click () {
            Ipc.sendToMainWin( 'editor:reset-layout', null);
          }
        },
      ]
    },

    // Developer
    {
      label: _T('MAIN_MENU.developer.title'),
      id: 'developer',
      submenu: [
        {
          label: _T('MAIN_MENU.developer.reload'),
          accelerator: 'CmdOrCtrl+R',
          click ( item, focusedWindow ) {
            // DISABLE: Console.clearLog();
            focusedWindow.webContents.reload();
          }
        },
        {
          label: _T('MAIN_MENU.developer.reload_no_cache'),
          accelerator: 'CmdOrCtrl+Shift+R',
          click ( item, focusedWindow ) {
            // DISABLE: Console.clearLog();
            focusedWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: _T('MAIN_MENU.developer.inspect'),
          accelerator: 'CmdOrCtrl+Shift+C',
          click () {
            let nativeWin = Electron.BrowserWindow.getFocusedWindow();
            let editorWin = Window.find(nativeWin);
            if ( editorWin ) {
              editorWin.send( 'editor:window-inspect' );
            }
          }
        },
        {
          label: _T('MAIN_MENU.developer.devtools'),
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I';
            } else {
              return 'Ctrl+Shift+I';
            }
          })(),
          click ( item, focusedWindow ) {
            if ( focusedWindow ) {
              focusedWindow.openDevTools();
              if ( focusedWindow.devToolsWebContents ) {
                focusedWindow.devToolsWebContents.focus();
              }
            }
          }
        },
        {
          label: _T('MAIN_MENU.developer.toggle_node_inspector'),
          type: 'checkbox',
          dev: true,
          checked: false,
          click ( item ) {
            item.checked = Debugger.toggleNodeInspector();
          }
        },
        {
          label: _T('MAIN_MENU.developer.toggle_repl'),
          type: 'checkbox',
          dev: true,
          checked: true, // turn on by default
          click ( item ) {
            item.checked = Debugger.toggleRepl();
          }
        },
        { type: 'separator' },
        {
          label: 'Human Tests',
          dev: true,
          submenu: [
            { type: 'separator' },
            {
              label: 'Throw an Uncaught Exception',
              click () {
                throw new Error('editor-framework Unknown Error');
              }
            },
            {
              label: 'send2panel \'foo:bar\' foobar.panel',
              click () {
                Ipc.sendToPanel( 'foobar', 'foo:bar' );
              }
            },
          ],
        },
        { type: 'separator' },
      ]
    },
  ];
}

// ========================================
// Ipc
// ========================================

const ipcMain = Electron.ipcMain;

// ipc
ipcMain.on('main-menu:init', () => {
  MainMenu.init();
});

ipcMain.on('main-menu:add', ( event, path, template ) => {
  MainMenu.add( path, template );
});

ipcMain.on('main-menu:remove', ( event, path ) => {
  MainMenu.remove( path );
});

ipcMain.on('main-menu:set', ( event, path, options ) => {
  MainMenu.set( path, options );
});

ipcMain.on('main-menu:update', ( event, path, template ) => {
  MainMenu.update( path, template );
});

ipcMain.on('main-menu:apply', () => {
  MainMenu.apply();
});
