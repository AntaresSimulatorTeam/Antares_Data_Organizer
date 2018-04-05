'use strict';

const DomUtils = require('../utils/dom-utils');

// ==========================
// exports
// ==========================

let Focusable = {
  get focusable () {
    return true;
  },

  /**
   * @property focused
   * @readonly
   */
  get focused () {
    return this.getAttribute('focused') !== null;
  },

  /**
   * @property disabled
   */
  get disabled () {
    return this.getAttribute('disabled') !== null;
  },
  set disabled (val) {
    if ( val ) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  },

  /**
   * @property unnavigable
   */
  get unnavigable () {
    return this.getAttribute('unnavigable') !== null;
  },
  set unnavigable (val) {
    if ( val ) {
      this.setAttribute('unnavigable', '');
    } else {
      this.removeAttribute('unnavigable');
    }
  },

  /**
   * @property loopable
   */
  get loopable () {
    return this.getAttribute('loopable') !== null;
  },
  set loopable (val) {
    if ( val ) {
      this.setAttribute('loopable', '');
    } else {
      this.removeAttribute('loopable');
    }
  },

  _initFocusable ( focusELs, navELs ) {
    // focusELs
    if ( focusELs ) {
      if ( Array.isArray(focusELs) ) {
        this._focusELs = focusELs;
      } else {
        this._focusELs = [focusELs];
      }
    } else {
      this._focusELs = [];
    }

    // navELs
    if ( navELs ) {
      if ( Array.isArray(navELs) ) {
        this._navELs = navELs;
      } else {
        this._navELs = [navELs];
      }
    } else {
      this._navELs = this._focusELs;
    }

    // NOTE: always make sure this element focusable
    this.tabIndex = -1;

    // REF: http://webaim.org/techniques/keyboard/tabindex
    for ( let i = 0; i < this._focusELs.length; ++i ) {
      let el = this._focusELs[i];
      el.tabIndex = -1;
      el.addEventListener('focus', () => { this._curFocus = el; });
    }
  },

  _isDisabledInHierarchy () {
    if ( this.disabled ) {
      return true;
    }

    let parent = this.parentNode;
    while ( parent ) {
      if ( parent.disabled ) {
        return true;
      }

      parent = parent.parentNode;
    }

    return false;
  },

  _getFirstFocusableElement () {
    if ( this._focusELs.length > 0 ) {
      return this._focusELs[0];
    }
    return null;
  },

  // NOTE: only invoked by FocusMgr
  _setFocused ( focused ) {
    // NOTE: disabled object can be focused, it just can not be navigate.
    //       (for example, disabled prop can be fold/foldup by left/right key)
    // if ( this._isDisabledInHierarchy() ) {
    //   return;
    // }

    if ( this.focused === focused ) {
      return;
    }

    if ( focused ) {
      this.setAttribute('focused', '');

      if ( this._focusELs.length > 0 ) {
        let focusEL = this._focusELs[0];
        if ( focusEL === this ) {
          focusEL.focus();
        } else {
          if ( focusEL.focusable ) {
            focusEL._setFocused(true);
          } else {
            focusEL.focus();
          }
        }
      }
    } else {
      this.removeAttribute('focused');

      this._focusELs.forEach(el => {
        if ( el.focusable && el.focused ) {
          el._setFocused(false);
        }
      });
    }

    DomUtils.fire(this, 'focus-changed', {
      bubbles: true,
      detail: {
        focused: this.focused,
      },
    });
  },
};

module.exports = Focusable;
