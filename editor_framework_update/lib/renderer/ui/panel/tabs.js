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

const JS = require('../../../share/js-utils');
const Tab = require('./tab');
const Droppable = require('../behaviors/droppable');
const DockUtils = require('../utils/dock-utils');
const DomUtils = require('../utils/dom-utils');
const FocusMgr = require('../utils/focus-mgr');

// ==========================
// exports
// ==========================

class Tabs extends window.HTMLElement {
  static get tagName () { return 'UI-DOCK-TABS'; }

  createdCallback () {
    let root = this.createShadowRoot();
    root.innerHTML = `
      <div class="border">
        <div class="tabs">
          <content select="ui-dock-tab"></content>
        </div>

        <div id="popup" class="icon" on-click="_onPopup">
        </div>
        <div id="menu" class="icon" on-click="_onMenuPopup">
        </div>
        <div id="insertLine" class="insert"></div>
      </div>
    `;
    root.insertBefore(
      DomUtils.createStyleElement('editor-framework://dist/css/elements/tabs.css'),
      root.firstChild
    );

    // init
    this.activeTab = null;
    this._focused = false;

    // query element
    this.$ = {
      popup: this.shadowRoot.querySelector('#popup'),
      menu: this.shadowRoot.querySelector('#menu'),
      insertLine: this.shadowRoot.querySelector('#insertLine'),
    };

    // init events
    this.addEventListener('mousedown', event => { event.preventDefault(); });
    this.addEventListener('click', this._onClick.bind(this));
    this.addEventListener('tab-click', this._onTabClick.bind(this));
    this.addEventListener('drop-area-enter', this._onDropAreaEnter.bind(this));
    this.addEventListener('drop-area-leave', this._onDropAreaLeave.bind(this));
    this.addEventListener('drop-area-accept', this._onDropAreaAccept.bind(this));
    this.addEventListener('dragover', this._onDragOver.bind(this));
    this.$.popup.addEventListener('click', this._onPopup.bind(this));
    this.$.menu.addEventListener('click', this._onMenuPopup.bind(this));

    // init droppable
    this.droppable = 'tab';
    this.singleDrop = true;
    this._initDroppable(this);

    if ( this.children.length > 0 ) {
      this.select(this.children[0]);
    }
  }

  _setFocused ( focused ) {
    this._focused = focused;

    for ( let i = 0; i < this.children.length; ++i ) {
      let tabEL = this.children[i];
      tabEL.focused = focused;
    }
  }

  findTab ( frameEL ) {
    for ( let i = 0; i < this.children.length; ++i ) {
      let tabEL = this.children[i];
      if ( tabEL.frameEL === frameEL ) {
        return tabEL;
      }
    }

    return null;
  }

  insertTab ( tabEL, insertBeforeTabEL ) {
    // do nothing if we insert to ourself
    if ( tabEL === insertBeforeTabEL ) {
      return tabEL;
    }

    if ( insertBeforeTabEL ) {
      this.insertBefore(tabEL, insertBeforeTabEL);
    } else {
      this.appendChild(tabEL);
    }
    tabEL.focused = this._focused;

    return tabEL;
  }

  addTab ( name ) {
    let tabEL = document.createElement('ui-dock-tab');
    tabEL.name = name;

    this.appendChild(tabEL);
    tabEL.focused = this._focused;

    return tabEL;
  }

  removeTab ( tab ) {
    let tabEL = null;
    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( tab.tagName === Tab.tagName ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      if ( this.activeTab === tabEL ) {
        this.activeTab = null;

        let nextTab = tabEL.nextElementSibling;
        if ( !nextTab ) {
          nextTab = tabEL.previousElementSibling;
        }

        if ( nextTab ) {
          this.select(nextTab);
        }
      }

      tabEL.focused = false;
      this.removeChild(tabEL);
    }
  }

  select ( tab ) {
    let tabEL = null;

    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( tab.tagName === Tab.tagName ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      if ( tabEL !== this.activeTab ) {
        let oldTabEL = this.activeTab;

        if ( this.activeTab !== null ) {
          this.activeTab.classList.remove('active');
        }
        this.activeTab = tabEL;
        this.activeTab.classList.add('active');

        let panelID = tabEL.frameEL.getAttribute('id');
        let pagePanelInfo = Editor.Panel.getPanelInfo(panelID);
        if ( pagePanelInfo ) {
          this.$.popup.classList.toggle('hide', !pagePanelInfo.popable);
        }

        DomUtils.fire( this, 'tab-changed', {
          bubbles: true,
          detail: {
            oldTab: oldTabEL,
            newTab: tabEL
          }
        });
      }

      // NOTE: focus should after tab-changed, which will change the display style for panel frame
      FocusMgr._setFocusPanelFrame(tabEL.frameEL);
    }
  }

  outOfDate ( tab ) {
    let tabEL = null;

    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( tab.tagName === Tab.tagName ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      tabEL.outOfDate = true;
    }
  }

  _onClick ( event ) {
    event.stopPropagation();
    FocusMgr._setFocusPanelFrame(this.activeTab.frameEL);
  }

  _onTabClick ( event ) {
    event.stopPropagation();
    this.select(event.target);
  }

  _onDropAreaEnter ( event ) {
    event.stopPropagation();
  }

  _onDropAreaLeave ( event ) {
    event.stopPropagation();

    this.$.insertLine.style.display = '';
  }

  _onDropAreaAccept ( event ) {
    event.stopPropagation();

    DockUtils.dropTab(this, this._curInsertTab);
    this.$.insertLine.style.display = '';
  }

  _onDragOver ( event ) {
    // NOTE: in web, there is a problem:
    // http://stackoverflow.com/questions/11974077/datatransfer-setdata-of-dragdrop-doesnt-work-in-chrome
    let type = event.dataTransfer.getData('editor/type');
    if ( type !== 'tab' ) {
      return;
    }

    DockUtils.dragoverTab( this );

    //
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    let eventTarget = event.target;

    //
    this._curInsertTab = null;
    let style = this.$.insertLine.style;
    style.display = 'block';
    if ( eventTarget.tagName === Tab.tagName ) {
      style.left = eventTarget.offsetLeft + 'px';
      this._curInsertTab = eventTarget;
    } else {
      let el = this.lastElementChild;
      style.left = (el.offsetLeft + el.offsetWidth) + 'px';
    }
  }

  _onPopup ( event ) {
    event.stopPropagation();

    if ( this.activeTab ) {
      let panelID = this.activeTab.frameEL.getAttribute('id','');
      Editor.Panel.popup(panelID);
    }
  }

  _onMenuPopup ( event ) {
    event.stopPropagation();

    let rect = this.$.menu.getBoundingClientRect();
    let panelID = '';
    if ( this.activeTab ) {
      panelID = this.activeTab.frameEL.getAttribute('id','');
    }

    let panelInfo = Editor.Panel.getPanelInfo(panelID);
    let popable = true;
    if ( panelInfo ) {
      popable = panelInfo.popable;
    }

    Editor.Menu.popup([
      { label: Editor.T('PANEL_MENU.maximize'), dev: true, message: 'editor:panel-maximize', params: [panelID] },
      { label: Editor.T('PANEL_MENU.pop_out'), message: 'editor:panel-popup', enabled: popable, params: [panelID] },
      { label: Editor.T('PANEL_MENU.close'), command: 'Editor.Panel.close', params: [panelID] },
      { label: Editor.T('PANEL_MENU.add_tab'), dev:true, submenu: [
      ]},
    ], rect.left + 5, rect.bottom + 5);
  }
}

JS.addon(Tabs.prototype, Droppable);

module.exports = Tabs;

