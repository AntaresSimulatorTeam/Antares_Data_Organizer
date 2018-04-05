'use strict';

describe('sites', function () {
  this.timeout(0);

  it('choose a site', function ( done ) {
    const Electron = require('electron');
    let win = new Electron.BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        allowDisplayingInsecureContent: true,
        allowRunningInsecureContent: true,
      }
    });

    // flexbox bug
    // REF: https://github.com/angular/material/issues/6841
    // REF: https://bugs.chromium.org/p/chromium/issues/detail?id=580196
    win.loadURL('http://jpdevries.github.io/eureka/examples/');

    // webgl report
    // win.loadURL('http://webglreport.com/');
  });
});
