'use strict';

// ==========================
// exports
// ==========================

function ui_color (color) {
  let el = document.createElement('ui-color');
  if ( color ) {
    el.value = color;
  }

  return el;
}

module.exports = ui_color;

// a global color picker
let _colorPicker;

// ==========================
// internal
// ==========================

const Chroma = require('chroma-js');

const JS = require('../../../share/js-utils');
const DomUtils = require('../utils/dom-utils');
const FocusMgr = require('../utils/focus-mgr');
const Focusable = require('../behaviors/focusable');
const ColorPicker = require('./color-picker');

class ColorElement extends window.HTMLElement {

  get value () { return this._value; }
  set value (val) {
    let rgba = Chroma(val).rgba();
    if ( rgba !== this._value ) {
      this._value = rgba;

      this._updateRGB();
      this._updateAlpha();
    }
  }

  createdCallback () {
    let root = this.createShadowRoot();
    root.innerHTML = `
      <div class="inner">
        <div class="rgb"></div>
        <div class="alpha"></div>
      </div>
      <div class="mask"></div>
    `;
    root.insertBefore(
      DomUtils.createStyleElement('editor-framework://dist/css/elements/color.css'),
      root.firstChild
    );

    this._rgb = root.querySelector('.rgb');
    this._alpha = root.querySelector('.alpha');

    // init _value
    let value = this.getAttribute('value');
    if ( value !== null ) {
      this._value = Chroma(value).rgba();
    } else {
      this._value = [255,255,255,1];
    }

    // update control
    this._updateRGB();
    this._updateAlpha();

    //
    this._initFocusable(this);
    this._initEvents();

    // init global color-picker
    if ( !_colorPicker ) {
      _colorPicker = new ColorPicker();
      _colorPicker.style.position = 'fixed';
      _colorPicker.style.zIndex = 999;
    }
  }

  _initEvents () {
    this.addEventListener('mousedown', event => {
      DomUtils.acceptEvent(event);
      FocusMgr._setFocusElement(this);

      document.body.appendChild( _colorPicker );
      _colorPicker.value = this.value;

      this._updateColorPickerPosition();
    });
  }

  _updateRGB () {
    this._rgb.style.backgroundColor = Chroma(this._value).hex();
  }

  _updateAlpha () {
    this._alpha.style.width = `${this._value[3]*100}%`;
  }

  _equals ( val ) {
    if ( this._value.length !== val.length ) {
      return false;
    }

    return this._value[0] === val[0]
      && this._value[1] === val[1]
      && this._value[2] === val[2]
      && this._value[3] === val[3]
      ;
  }

  _updateColorPickerPosition () {
    window.requestAnimationFrame( () => {
      let bodyRect = document.body.getBoundingClientRect();
      let thisRect = this.getBoundingClientRect();
      let colorPickerRect = _colorPicker.getBoundingClientRect();

      let style = _colorPicker.style;
      style.left = (thisRect.right - colorPickerRect.width) + 'px';

      if ( document.body.clientHeight - thisRect.bottom <= colorPickerRect.height + 10 ) {
        style.top = (thisRect.top - bodyRect.top - colorPickerRect.height - 10) + 'px';
      } else {
        style.top = (thisRect.bottom - bodyRect.top + 10) + 'px';
      }

      if ( document.body.clientWidth - thisRect.left <= colorPickerRect.width ) {
        style.left = (thisRect.left - bodyRect.left) + 'px';
      } else {
        style.left = (thisRect.right - bodyRect.left - thisRect.width) + 'px';
      }

      this._updateColorPickerPosition();
    });
  }
}

JS.addon(ColorElement.prototype, Focusable);

ui_color.element = ColorElement;
