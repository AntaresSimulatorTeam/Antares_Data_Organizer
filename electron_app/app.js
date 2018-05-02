'use strict'; //More warnings and errors

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Libraries used
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const electron = require('electron');
const remote = electron.remote;
const Editor = require('./node_modules/editor-framework/index');
const path = require('path');
const winston= require('winston');
const fs = require('fs-plus');
//Change to relase before delivery
const appLevel='debug';
//const appLevel='release';

let _url2path = base => {
	return uri => {
		if ( uri.pathname ) {
			return Path.join( base, uri.host, uri.pathname );
		}
		return Path.join( base, uri.host );
	};
};
Editor.Protocol.register('app://layout.json', _url2path(Editor.frameworkPath));


//used in the logger
function customFileFormatter (args) {
    // Return string will be passed to logger.
    if(args.level!='verbose'){
		var tzoffset = (new Date()).getTimezoneOffset() * 60000;
		return "["+ new Date(Date.now() - tzoffset).toISOString().replace(/T/, ' ').replace(/\..+/, '')+"][antares_Data_Organizer]["+args.level+"]"+args.message;
	}
	else return args.message;
}


Editor.App.extend({
  init ( opts, cb ) {
    Editor.init({
      layout: Editor.url('app://layout.json'),
      'package-search-path': [
        Editor.url('app://packages/'),
      ],
    });

    cb ();
  },

  run () {
	var tzoffset = (new Date()).getTimezoneOffset() * 60000; 
	var pathLogVar;
	if(process.platform=="win32"){
		if(!fs.existsSync(path.join(process.env.LOCALAPPDATA,"rte"))){
			fs.mkdirSync(path.join(process.env.LOCALAPPDATA,"rte"));
		}
		if(!fs.existsSync(path.join(process.env.LOCALAPPDATA,"rte/antares_Data_Organizer"))){
			fs.mkdirSync(path.join(process.env.LOCALAPPDATA,"rte/antares_Data_Organizer"));
		}
		pathLogVar=path.join(path.join(process.env.LOCALAPPDATA,"rte/antares_Data_Organizer"),"log_"+new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,'')+".txt");
	}
	else if(process.platform=="linux"){
		if(!fs.existsSync(path.join(process.env.HOME,"AppData"))){
			fs.mkdirSync(path.join(process.env.HOME,"AppData"));
		}
		if(!fs.existsSync(path.join(process.env.HOME,"AppData/Local"))){
			fs.mkdirSync(path.join(process.env.HOME,"AppData/Local"));
		}
		if(!fs.existsSync(path.join(process.env.HOME,"AppData/Local/rte"))){
			fs.mkdirSync(path.join(process.env.HOME,"AppData/Local/rte"));
		}
		if(!fs.existsSync(path.join(process.env.HOME,"AppData/Local/rte/antares_Data_Organizer"))){
			fs.mkdirSync(path.join(process.env.HOME,"AppData/Local/rte/antares_Data_Organizer"));
		}
		pathLogVar=path.join(path.join(process.env.HOME,"AppData/Local/rte/antares_Data_Organizer"),"log_"+new Date(Date.now() - tzoffset).toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g,'').replace(/-/g,'')+".txt");
	}
	
	if(appLevel=='debug'){
		var loggerActions = new (winston.Logger)({
			transports: [
			  new (winston.transports.Console)(),
			  new (winston.transports.File)({ 
				filename: pathLogVar,
				json: false,
				formatter: customFileFormatter,
				level: 'debug'
			  })
			]
		});
	}
	else{
		var loggerActions = new (winston.Logger)({
			transports: [
			  new (winston.transports.Console)(),
			  new (winston.transports.File)({ 
				filename: pathLogVar,
				json: false,
				formatter: customFileFormatter,
				level: 'verbose'
			  })
			]
		});
	}
	var globalPathVar="";
	global.sharedObj = {loggerActions: loggerActions,
						logPath:pathLogVar,
						globalPath: globalPathVar,
						password: "Antares_Data_Organizer_Password_Format_001",
						appLevel:appLevel
						};
    // create main window
    let mainWin = new Editor.Window('main', {
      title: 'Antares Data Organizer',
      width: 900,
      height: 700,
      minWidth: 1200,
      minHeight: 600,
      show: false,
      resizable: true,
      icon: path.join(__dirname + '../resources/dataorganizer.png'), 
    });
    Editor.Window.main = mainWin;

    // restore window size and position
    mainWin.restorePositionAndSize();

    // load and show main window
    mainWin.show();

    // page-level test case
    mainWin.load( 'app://index.html' );
    // open dev tools if needed
    if ( Editor.argv.showDevtools ) {
      // NOTE: open dev-tools before did-finish-load will make it insert an unused <style> in page-level
      mainWin.nativeWin.webContents.once('did-finish-load', function () {
        mainWin.openDevTools();
      });
    }
    mainWin.focus();
	Editor.MainMenu.remove('Help');
	Editor.MainMenu.remove('Edit');
	//Editor.MainMenu.remove('Editor Framework');
	Editor.MainMenu.remove('Layout');
	if(appLevel!='debug'){
		Editor.MainMenu.remove('Developer');
	}
  },
});
