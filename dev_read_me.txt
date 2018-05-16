How to start:

-install the nodejs env to your computer, including npm (if necessary,set the proxies
	set the proxies
	npm config set registry http://registry.npmjs.org/
	git config --global url."https://".insteadOf git://
	npm config set proxy http://usr:pwd@163.104.40.34:3128
	npm config set https-proxy http://usr:pwd@163.104.40.34:3128
	npm install)

-go to ./electron_app and run npm install (if on windows, this step is not mandatory as the packages are already installed. However, it is good to keep them up to date)

-replace files in ./electron_app/node_modules/editor_framework by the corresponding files in ./editor_framework_update (this changes the name of the app in en.js, hides the possibility of detached tabs in panel/tabs.js, hides some unused menus in main/main-menus.js and changes the home directory in main/app.js)

-if using linux, install 7za globally (sudo apt-get install 7za)

At this point, the app can be launched by running electron from command line with the following line of command (minus the .exe in linux):
	"...mypath.../electron_app/node_modules/electron/dist/electron.exe" "...mypath.../electron_app"

To create a package :

-go to app.js and comment/uncomment the lines defining debug/release

-install electron packager to the computer

-run package.bat on windows, or package.sh on linux (if it is not working, change the electron-packager command line by reading how to package.txt). It will create the package, and the copy external ressources in it (7z.exe, icons, doc)

The following steps are for windows only :
-install nsis (a portable version is sufficient)

-use nsis to run generateinstaller.nsi, that will create AntaresDataOrganizerInstallerV1.1.exe

================================================================================================================================================================

About Electron :

Electron is a framework for creating native applications with web technologies like JavaScript, HTML, and CSS. In this instace, it is used to create a complitly offline application. Electron is a fast evolving package, so it is better to test if the last version is compatible after using npm install

About Editor framework:

Editor framework is a framework used to easily create a multi-pannel application in electron. It also handles ips communication between or inside pannels, nodejs error logs and preference storage.
Unfortunatly, it is no lunger updated, its last stable update was commited just before the start of the devellopement of the antares data organizer.

About project architecture inside electron_app :

The app.js file is where the window is created, and the global variables and loggers initialized. It is also where the log path is created.
The layout.json is where properties of the window are defined.
The index.html file is just a nearly empty file. Most of the html code is in the pannels.
The general.css file is where global changes can be made to all tabs at once.

In src, .js files contain externalized function, and a .json file contains a list of defined tags. 

In package/simple
-package.json is where the properties of each pannels are defined, and some menues are created
-main.js is where the menu events are received and sent to the corresponding pannels
-the pannels themselves have a common structure :
At the top, pannel variables and libraries are defined
Then, internal functions
Then the html and css code for the pannel
Then, the ips message recpetion

In case the Editor framework had to be replaced, most of the nodejs functions could be reused, but a new way of implementing ips communication would have to be found, as well as a new pannel manager.
