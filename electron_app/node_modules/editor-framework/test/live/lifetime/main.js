'use strict';

let ipc = new Editor.IpcListener();
let title = 'demo: lifetime';

describe(title, function () {
  this.timeout(0);

  afterEach(function () {
    ipc.clear();
  });

  it(title, function ( done ) {
    let win = new Editor.Window('main', {
      title: title
    });
    let events = [
      'did-start-loading',
      'did-stop-loading',
      'did-finish-load',
      'did-frame-finish-load',
      'dom-ready',
      // 'destroyed',
    ];

    events.forEach(name => {
      win.nativeWin.webContents.on(name, () => {
        Editor.info(name);
      });
    });

    win.load('editor-framework://test/demo/lifetime/page.html');
  });
});
