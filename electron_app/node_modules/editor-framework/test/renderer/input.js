'use strict';

suite(tap, '<ui-input>', {timeout: 2000}, t => {
  function _newElement ( cb ) {
    helper.runElement(
      'editor-framework://test/fixtures/input.html', 'simple', '#element', cb
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

  t.test('should get "Foobar" from value property', t => {
    _newElement(el => {
      t.equal(el.value, 'Foobar');
      t.end();
    });
  });

  t.test('should send "cancel" when "esc" key down on the element', t => {
    _newElement(el => {
      el.addEventListener('cancel', () => {
        t.end();
      });

      helper.mousedown( el, 'left' );
      setTimeout(() => {
        helper.keydown('esc' );
      }, 10);
    });
  });

  t.test('should send "confirm" when "enter" key down on the element', t => {
    _newElement(el => {
      el.addEventListener('confirm', () => {
        t.end();
      });

      helper.mousedown( el, 'left' );
      setTimeout(() => {
        helper.keydown('enter' );
      }, 10);
    });
  });

  t.test('should directly change the text to "abc" when you click the element and type "abc"', t => {
    _newElement(el => {
      helper.mousedown( el, 'left' );
      helper.keydown('a' );
      helper.keydown('b' );
      helper.keydown('c' );

      setTimeout(() => {
        t.equal(el.value, 'Foobar');
        t.end();
      }, 10);
    });
  });
});
