'use strict';

/**
 * The `core-level` debugger utils, when you turn on the debugger,
 * it actually run a [node-inspector](https://github.com/node-inspector/node-inspector)
 * process in the low-level, and you can use your chrome browser debug the core module.
 * @module Editor.Debugger
 */
let Debugger = {};
module.exports = Debugger;

// requires
const ChildProcess = require('child_process');
const Repl = require('repl');

// DISABLE: vorpal
const Chalk = require('chalk');
// const Vorpal = require('vorpal');

const Console = require('./console');

// repl
let _replServer;
let _replRunning = false;

function _eval ( cmd, context, filename, callback ) {
  try {
    let result = eval(cmd);
    callback(null, result);
  } catch (e) {
    console.log(Chalk.red(e.stack));
  }
}

// DISABLE: vorpal
// let _vorpal = Vorpal();
// _vorpal.delimiter('editor$');

// _vorpal.mode('debug')
//   .delimiter('debugger>')
//   .description('Enters REPL debug mode.')
//   .action(function (command, callback) {
//     try {
//       if ( command === 'debugger' ) {
//         throw new Error('debugger command is not allowed!');
//       }

//       let result = eval(command);
//       this.log(result);
//     } catch (e) {
//       this.log(Chalk.red(e));
//     }
//     callback();
//   })
//   ;

// node-inspector
let _nodeInspector;
let _dbgPort = 3030;

// ==========================
// exports
// ==========================

/**
 * Toggle on or off the `core-level` debugger
 * @method toggle
 */
Debugger.toggleRepl = function () {
  if ( _replRunning ) {
    Debugger.stopRepl();
  } else {
    Debugger.startRepl();
  }

  return _replRunning;
};

Debugger.startRepl = function () {
  _replRunning = true;

  _replServer = Repl.start({
    prompt: 'editor$ > ',
    eval: _eval
  }).on('exit', () => {
    // process.exit(0); // DISABLE
    _replServer = null;
    _replRunning = false;
    console.info('Repl debugger closed');
  });

  // DISABLE
  // _vorpal.show();
  // _vorpal.exec('debug');
};

Debugger.stopRepl = function () {
  if ( !_replRunning ) {
    return;
  }

  // DISABLE
  // _replServer.removeAllListeners('exit');
  _replServer.write('.exit\n');

  // DISABLE
  // _vorpal.hide();
};

/**
 * Toggle on or off the `core-level` debugger
 * @method toggle
 */
Debugger.toggleNodeInspector = function () {
  if ( _nodeInspector ) {
    Debugger.stopNodeInspector();
  } else {
    Debugger.startNodeInspector();
  }

  return _nodeInspector !== null;
};

/**
 * Turn on the `core-level` debugger
 * @method start
 */
Debugger.startNodeInspector = function () {
  try {
    _nodeInspector = ChildProcess.spawn('node-inspector', ['--debug-port=' + _dbgPort], {
      stdio: 'inherit',
    });
  } catch ( err ) {
    Console.failed ( `Failed to start node-inspector: ${err.message}` );
    _nodeInspector = null;

    return;
  }

  Console.info(`node-inspector started: http://127.0.0.1:8080/debug?ws=127.0.0.1:8080&port=${_dbgPort}`);

  // DISABLE FIXME: not work in this way
  // const Electron = require('electron');
  // let debuggerWin = new Electron.BrowserWindow({
  //   webPreferences: {
  //     nodeIntegration: false,
  //   }
  // });
  // let url = `http://127.0.0.1:8080/debug?ws=127.0.0.1:8080&port=${_dbgPort}`;
  // debuggerWin.loadURL(url);
  // debuggerWin.on ( 'closed', function () {
  //   _nodeInspector.kill();
  //   Console.info('debugger process closed');
  // });
};

/**
 * Turn off the `core-level` debugger
 * @method stop
 */
Debugger.stopNodeInspector = function () {
  if ( !_nodeInspector ) {
    return;
  }

  _nodeInspector.kill();
  _nodeInspector = null;

  Console.info('node-inspector stopped');
};

Object.defineProperty(Debugger, 'debugPort', {
  enumerable: true,
  get () { return _dbgPort; },
  set ( value ) { _dbgPort = value; },
});

Object.defineProperty(Debugger, 'replRunning', {
  enumerable: true,
  get () { return _replRunning; }
});
