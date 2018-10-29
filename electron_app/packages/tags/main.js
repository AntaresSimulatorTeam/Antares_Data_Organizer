'use strict';

function openPanel1(callback) {
   Editor.Panel.open('tabs.01');
   callback();
}

module.exports = {
  load () {
  },

  unload () {
  },

  messages: {
    open1 () {
      Editor.Panel.open('tabs.01');
    },
	open2 () {
      Editor.Panel.open('tabs.02');
    },
	open3 () {
      Editor.Panel.open('tabs.03');
    },
	open4 () {
      Editor.Panel.open('tabs.04');
    },
	openfile (){
		Editor.Panel.open('tabs.01');
		openPanel1(Editor.Ipc.sendToPanel('tabs.01','open'));
		/*try {
			const electron = require('electron');
			const remote = electron.remote;
			const dialog = ('electron').remote.dialog;
			var fs = require('fs');
			var path = require('path');
			}
		catch(err) {
			Editor.log(err.message);
		}
			Editor.log('r');

		
		try {
		}
		catch(err) {
			Editor.log(err.message);
		}
		Editor.log('b');
		var liste=document.getElementById('myliste');
		Editor.log('c');
		while (liste.firstChild) {
				   // le supprime
				   liste.removeChild(liste.firstChild);
		}
		pathfile=rdialog.showOpenDialog({properties: [ 'openFile', 'openDirectory', 'multiSelections' ] });
		fs.readdir(pathfile[0], function(err, items) {
					saveitems=items;
					for (var i=0; i<items.length; i++) {
							if(fs.statSync(path.join(pathfile[0], items[i])).isDirectory()){
								var nouveau_li = document.createElement('li');
								console.log(items[i]);
								var nomdossier = document.createTextNode(items[i]);
								nouveau_li.appendChild(nomdossier);
								//document.body.insertBefore(nouveau_li, document.getElementsByTagName('myliste')[]);
								liste.appendChild(nouveau_li);
							}
				}
		});
	*/
	
	
	},
	openlib (){
		Editor.Ipc.sendToPanel('tabs.03','openlib');
	},
	
	openMainFolder (){
		Editor.Ipc.sendToPanel('tabs.03','openMainFolder');
	},
	openScat (){
		Editor.Ipc.sendToPanel('tabs.03','openScat');
	},
	openAcat (){
		Editor.Ipc.sendToPanel('tabs.03','openAcat');
	},
	openFolder (){
		Editor.Ipc.sendToPanel('tabs.03','openFolder');
	},
	openHelp (){
		Editor.Ipc.sendToPanel('tabs.03','openHelp');
	},
	openTrouble (){
		Editor.Ipc.sendToPanel('tabs.03','openTrouble');
	},
	openChest (){
		Editor.Ipc.sendToPanel('tabs.04','openChest');
	},
	openSink (){
		Editor.Ipc.sendToPanel('tabs.01','openRight');
	},
	openSource (){
		Editor.Ipc.sendToPanel('tabs.01','openLeft');
	},
	openLogFolder(){
		Editor.Ipc.sendToPanel('tabs.03','openLogFolder');
	},
	openLog(){
		Editor.Ipc.sendToPanel('tabs.03','openLog');
	},
  },
};