'use strict';

describe('canvas-focus', function () {
  this.timeout(0);

  it('is a demo', function ( done ) {
    const Electron = require('electron');

    let win = new Editor.Window();
    win.load('editor-framework://test/live/canvas-focus/page.html');


    // win.nativeWin.webContents.on('dom-ready', () => {
    //   Editor.Ipc.sendToWins('foobar:say-hello', 'foo', 'bar');
    // });

    // ipc.on('foobar:reply', (event, foo, bar) => {
    //   expect(foo).to.eql('foo');
    //   expect(bar).to.eql('bar');
    //   // win.close();
    // });
  });
});
