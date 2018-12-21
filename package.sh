#!/bin/bash

electron-packager ./electron_app/ AntaresDataOrganizer --platform=linux --arch=x64 --asar --icon=AntaresDataOrganizer.png
cp resources/data-organizer-reference-guide.pdf AntaresDataOrganizer-linux-x64/resources/data-organizer-reference-guide.pdf
cp resources/data-organizer-troubleshooting.pdf AntaresDataOrganizer-linux-x64/resources/data-organizer-troubleshooting.pdf
cp resources/dataorganizer.ico AntaresDataOrganizer-linux-x64/resources/dataorganizer.png
cp resources/scat.ico AntaresDataOrganizer-linux-x64/resources/scat.png
cp resources/antar.ico AntaresDataOrganizer-linux-x64/resources/antar.png
cp resources/antpack.ico AntaresDataOrganizer-linux-x64/resources/antpack.png
cp resources/settings.png AntaresDataOrganizer-linux-x64/resources/settings.png
cp resources/settingshover.png AntaresDataOrganizer-linux-x64/resources/settingshover.png
cp resources/dataorganizer.png AntaresDataOrganizer-linux-x64/resources/dataorganizer.png
mkdir AntaresDataOrganizer
mv AntaresDataOrganizer-linux-x64 AntaresDataOrganizer/AntaresDataOrganizer-linux-x64
cd AntaresDataOrganizer
ln -s AntaresDataOrganizer-linux-x64/AntaresDataOrganizer AntaresDataOrganizer 

