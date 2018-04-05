'use strict';

const DomUtils = require('../utils/dom-utils');
const FocusMgr = require('../utils/focus-mgr');

// ==========================
// exports
// ==========================

let ButtonState = {
  /**
   * @property pressed
   */
  get pressed () {
    return this.getAttribute('pressed') !== null;
  },

  _initButtonState () {
    // process events
    DomUtils.installDownUpEvent(this);

    this.addEventListener('keydown', event => {
      if ( this.disabled ) {
        return;
      }

      if ( event.keyCode === 32 /*space*/ ) {
        this._spaceKeyDownHandler(event);
      } else if ( event.keyCode === 13 /*enter*/ ) {
        this._enterKeyDownHandler(event);
      }
    });
    this.addEventListener('keyup', event => {
      if ( event.keyCode === 32 /*space*/ ) {
        this._spaceKeyUpHandler(event);
      }
    });
    this.addEventListener('down', this._mouseDownHandler);
    this.addEventListener('up', this._mouseUpHandler);
    this.addEventListener('click', this._clickHandler);
    this.addEventListener('focus-changed', this._focusChangedHandler);
  },

  _setPressed (val) {
    if (val) {
      this.setAttribute('pressed', '');
    } else {
      this.removeAttribute('pressed');
    }
  },

  _asyncClick () {
    setTimeout(() => {
      this.click();
    },1);
  },

  _spaceKeyDownHandler (event) {
    DomUtils.acceptEvent(event);

    this._setPressed(true);
  },

  _spaceKeyUpHandler (event) {
    DomUtils.acceptEvent(event);

    if ( this.pressed ) {
      this._asyncClick();
    }
    this._setPressed(false);
  },

  _enterKeyDownHandler (event) {
    DomUtils.acceptEvent(event);

    if ( this._enterTimeoutID ) {
      return;
    }

    this._setPressed(true);
    this._enterTimeoutID = setTimeout(() => {
      this._enterTimeoutID = null;
      this._setPressed(false);
      this.click();
    },100);
  },

  _mouseDownHandler (event) {
    DomUtils.acceptEvent(event);

    FocusMgr._setFocusElement(this);
    this._setPressed(true);
  },

  _mouseUpHandler (event) {
    DomUtils.acceptEvent(event);

    this._setPressed(false);
  },

  _clickHandler () {
    DomUtils.fire(this, 'end-editing', { bubbles: true });
  },

  _focusChangedHandler () {
    if ( !this.focused ) {
      this._setPressed(false);
    }
  },
};

module.exports = ButtonState;
