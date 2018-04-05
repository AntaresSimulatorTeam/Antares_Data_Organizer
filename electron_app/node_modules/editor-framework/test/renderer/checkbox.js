'use strict';

suite(tap, '<ui-checkbox>', {timeout: 2000}, t => {
  function _newElement ( cb ) {
    helper.runElement(
      'editor-framework://test/fixtures/checkbox.html', 'simple', '#element', cb
    );
  }

  t.beforeEach(done => {
    Editor.Window.center();
    done();
  });

  t.afterEach(done => {
    helper.reset();
    done();
  });

  t.test('should have shadow root', t => {
    _newElement(el => {
      t.assert(el.shadowRoot);
      t.end();
    });
  });

  t.test('should focus on element when left mouse down', t => {
    _newElement(el => {
      helper.mousedown( el, 'left' );

      setTimeout(() => {
        t.equal(el.focused, true);
        t.end();
      }, 1);
    });
  });

  t.test('should send "click" event when mouse click element', t => {
    _newElement(el => {
      el.addEventListener('click', () => {
        t.end();
      });
      helper.click( el, 'left' );
    });
  });

  t.test('should send "click" event when "space" key down and up on the element', t => {
    _newElement(el => {
      el.addEventListener('click', () => {
        t.end();
      });
      helper.focus(el);
      helper.pressSpace();
    });
  });

  t.test('should send "click" event when "enter" key down on the element', t => {
    _newElement(el => {
      el.addEventListener('click', () => {
        t.end();
      });
      helper.focus(el);
      helper.keydown('enter');
    });
  });

  t.test('should not send "click" event when only "space" key up on the element', t => {
    _newElement(el => {
      el.addEventListener('click', () => {
        t.assert(false, 'should not recieve click event');
      });
      helper.focus(el);
      helper.keyup('space');

      setTimeout(() => {
        t.end();
      }, 100);
    });
  });

  t.test('should send "end-editing" event when element clicked', t => {
    _newElement(el => {
      el.addEventListener('end-editing', () => {
        t.end();
      });
      helper.click( el, 'left' );
    });
  });

  t.test('should be checked when element clicked first time', t => {
    _newElement(el => {
      helper.click( el, 'left' );

      setTimeout(() => {
        t.equal(el.checked, true);

        t.end();
      }, 100);
    });
  });

  t.test('should be unchecked when element clicked two times', t => {
    _newElement(el => {
      helper.click( el, 'left' );
      helper.click( el, 'left' );

      setTimeout(() => {
        t.equal(el.checked, false);

        t.end();
      }, 100);
    });
  });
});
