'use strict';

describe('ipc', function () {
  this.timeout(0);

  let ipc = new Editor.IpcListener();

  afterEach(function () {
    ipc.clear();
  });

  it('is a demo', function ( done ) {
    ipc.on ('foobar:say-hello', ( event ) => {
      event.reply (null, {
        foo: 'foo',
        bar: 'bar',
        foobar: 'foobar',
      });
    });

    let win = new Editor.Window();
    win.load('editor-framework://test/demo/ipc-demo/page.html');
  });
});
