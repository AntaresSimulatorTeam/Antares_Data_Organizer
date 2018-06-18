call electron-packager ./electron_app AntaresDataOrganizer --platform=win32 --arch=x64 --asar --icon=.\resources\dataorganizer.ico --no-prune ::--download.cache=C:\Users\sylvmara\AppData\Roaming\npm-cache

call xcopy .\resources\7zx64\7za.dll .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\7zx64\7zxa.dll .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\7zx64\7z.exe .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\data-organizer-reference-guide.pdf .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\data-organizer-troubleshooting.pdf .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\acat.ico .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\scat.ico .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\antar.ico .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\dataorganizer.ico .\AntaresDataOrganizer-win32-x64\resources\
call xcopy .\resources\antpack.ico .\AntaresDataOrganizer-win32-x64\resources\
call PAUSE 