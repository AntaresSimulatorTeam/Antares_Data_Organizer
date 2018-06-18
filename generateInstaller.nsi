
!include LogicLib.nsh

!macro IsUserAdmin RESULT
 !define Index "Line${__LINE__}"
   StrCpy ${RESULT} 0
   System::Call '*(&i1 0,&i4 0,&i1 5)i.r0'
   System::Call 'advapi32::AllocateAndInitializeSid(i r0,i 2,i 32,i 544,i 0,i 0,i 0,i 0,i 0, \
   i 0,*i .R0)i.r5'
   System::Free $0
   System::Call 'advapi32::CheckTokenMembership(i n,i R0,*i .R1)i.r5'
   StrCmp $5 0 ${Index}_Error
   StrCpy ${RESULT} $R1
   Goto ${Index}_End
 ${Index}_Error:
   StrCpy ${RESULT} -1
 ${Index}_End:
   System::Call 'advapi32::FreeSid(i R0)i.r5'
 !undef Index
!macroend





RequestExecutionLevel Highest



# define the directory to install to, the desktop in this case as specified  
# by the predefined $DESKTOP variable


!define APPNAME "Antares Data Organizer"
!define VERSIONNUMBER "1.1"

# set the name of the installer
Outfile "AntaresDataOrganizerInstallerV${VERSIONNUMBER}-ia32.exe"

!define DISTRIBFOLDERNAME "AntaresDataOrganizer-win32-ia32"
InstallDir ""
LicenseData "software-license-agreement - data organizer.rtf"


Page license
Page directory
Page instfiles
 
 Function un.isEmptyDir
  # Stack ->                    # Stack: <directory>
  Exch $0                       # Stack: $0
  Push $1                       # Stack: $1, $0
  FindFirst $0 $1 "$0\*.*"
  strcmp $1 "." 0 _notempty
    FindNext $0 $1
    strcmp $1 ".." 0 _notempty
      ClearErrors
      FindNext $0 $1
      IfErrors 0 _notempty
        FindClose $0
        Pop $1                  # Stack: $0
        StrCpy $0 1
        Exch $0                 # Stack: 1 (true)
        goto _end
     _notempty:
       FindClose $0
       ClearErrors
       Pop $1                   # Stack: $0
       StrCpy $0 0
       Exch $0                  # Stack: 0 (false)
  _end:
FunctionEnd
 
 Function .onInit
 !insertmacro IsUserAdmin $0
${If} $0 > 0
	StrCpy $InstDir "$PROGRAMFILES\RTE\${APPNAME}\${VERSIONNUMBER}"
${Else}
	StrCpy $InstDir "$PROFILE\RTE\${APPNAME}\${VERSIONNUMBER}"
${EndIf}
FunctionEnd
 
# default section
Section

 
 
# define the output path for this file
SetOutPath $INSTDIR

 
# define what to install and place it in the output path
File /r ${DISTRIBFOLDERNAME}

!define EXEPATH "$InstDir\${DISTRIBFOLDERNAME}\AntaresDataOrganizer.exe"

# define uninstaller name
WriteUninstaller "$INSTDIR\uninstaller.exe"
#writing last byte of uninstaller wich stores value admin=0 or 1
 !insertmacro IsUserAdmin $0 ; $0 is now 1 if admin or 0 if not
FileOpen $1 "$InstDir\Uninstaller.exe" a
FileSeek $1 0 END
FileWriteByte $1 $0
FileClose $1
${If} $0 > 0
	WriteRegStr HKCR ".scat" "" "AntaresDataOrgCat"
	WriteRegStr HKCR ".acat" "" "AntaresDataOrgCat"
	WriteRegStr HKCR ".antpack" "" "AntaresDataOrgPack"
	WriteRegStr HKCR ".ado" "" "AntaresDataOrgAdo"
	WriteRegStr HKCR ".antar" "" "AntaresDataOrgAntar"
	WriteRegStr HKCR "AntaresDataOrgCat\shell\open\command" "" '"${EXEPATH}" -c "%1"'
	WriteRegStr HKCR "AntaresDataOrgPack\shell\open\command" "" '"${EXEPATH}" -a "%1"'
	WriteRegStr HKCR "AntaresDataOrgAntar\shell\open\command" "" '"${EXEPATH}" -a "%1"'
	WriteRegStr HKCR "AntaresDataOrgAdo\shell\open\command" "" '"${EXEPATH}" -s "%1"'
	WriteRegStr HKCR ".antar\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\antar.ico"
	WriteRegStr HKCR ".acat\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\acat.ico"
	WriteRegStr HKCR ".antpack\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\antpack.ico"
	WriteRegStr HKCR ".ado\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\ado.ico"
	WriteRegStr HKCR ".scat\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\scat.ico"
	WriteRegStr HKCR "Directory\Shell\ado" "" "Open into Antares Data Organizer"
	WriteRegStr HKCR "Directory\Shell\ado\command" "" '"${EXEPATH}" -p "%1"'
${Else}
	WriteRegStr HKCU "Software\classes\.scat\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\scat.ico"
	WriteRegStr HKCU "Software\classes\.antar\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\antar.ico"
	WriteRegStr HKCU "Software\classes\.acat\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\acat.ico"
	WriteRegStr HKCU "Software\classes\.antpack\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\antpack.ico"
	WriteRegStr HKCU "Software\classes\.ado\DefaultIcon" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\ado.ico"
	WriteRegStr HKCU "Software\classes\.scat" "" "AntaresDataOrgCat"
	WriteRegStr HKCU "Software\classes\.acat" "" "AntaresDataOrgCat"
	WriteRegStr HKCU "Software\classes\.antpack" "" "AntaresDataOrgPack"
	WriteRegStr HKCU "Software\classes\.antar" "" "AntaresDataOrgAntar"
	WriteRegStr HKCU "Software\classes\.ado" "" "AntaresDataOrgAdo"
	WriteRegStr HKCU "Software\classes\AntaresDataOrgCat\shell\open\command" "" '"${EXEPATH}" -c "%1"'
	WriteRegStr HKCU "Software\classes\AntaresDataOrgAntar\shell\open\command" "" '"${EXEPATH}" -a "%1"'
	WriteRegStr HKCU "Software\classes\AntaresDataOrgPack\shell\open\command" "" '"${EXEPATH}" -a "%1"'
	WriteRegStr HKCU "Software\classes\AntaresDataOrgAdo\shell\open\command" "" '"${EXEPATH}" -s "%1"'
	WriteRegStr HKCU "Software\classes\Directory\Shell\ado" "" "Open into Antares Data Organizer"
	WriteRegStr HKCU "Software\classes\Directory\Shell\ado\command" "" '"${EXEPATH}" -p "%1"'
${EndIf}

CreateShortCut "$INSTDIR\${APPNAME} ${VERSIONNUMBER}.lnk" "$INSTDIR\${DISTRIBFOLDERNAME}\AntaresDataOrganizer.exe" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\dataorganizer.ico"
CreateShortCut "$SMPROGRAMS\${APPNAME} ${VERSIONNUMBER}.lnk" "$INSTDIR\${DISTRIBFOLDERNAME}\AntaresDataOrganizer.exe" "" "$INSTDIR\${DISTRIBFOLDERNAME}\resources\dataorganizer.ico"
SectionEnd

 
# create a section to define what the uninstaller does.
# the section will always be named "Uninstall"
Section "Uninstall"


	#reading last byte of uninstaller wich stores value admin=0 or 1
FileOpen $1 "$ExePath" r
FileSeek $1 -1 END
FileReadByte $1 $0
FileClose $1
${If} $0 > 0
	 !insertmacro IsUserAdmin $0
	${If} $0 > 0
	Delete "$INSTDIR\uninstaller.exe"
	# now delete installed file
	rmdir /r "$INSTDIR\${DISTRIBFOLDERNAME}"
	delete "$INSTDIR\${APPNAME} ${VERSIONNUMBER}.lnk"
	delete "$SMPROGRAMS\${APPNAME} ${VERSIONNUMBER}.lnk"
	 Push "$INSTDIR"		#Delete instdir only if empty after installed filed has been deleted
	Call un.isEmptyDir
	Pop $0
	 StrCmp $0 1 0 +2, 
	rmdir "$INSTDIR" 
	DeleteRegKey HKCR ".scat" 
	DeleteRegKey HKCR ".antar" 
	DeleteRegKey HKCR ".acat"
	DeleteRegKey HKCR ".antpack"
	DeleteRegKey HKCR ".ado"
	DeleteRegKey HKCR "AntaresDataOrgAntar"
	DeleteRegKey HKCR "AntaresDataOrgCat"
	DeleteRegKey HKCR "AntaresDataOrgPack"
	DeleteRegKey HKCR "AntaresDataOrgAdo"
	DeleteRegKey HKCR "Directory\Shell\ado"
	${Else}
	MessageBox MB_OK "Please run this uninstaller as admin."
	${EndIf}
${Else}
	Delete "$INSTDIR\uninstaller.exe"
	# now delete installed file
	rmdir /r "$INSTDIR\${DISTRIBFOLDERNAME}"
	delete "$INSTDIR\${APPNAME} ${VERSIONNUMBER}.lnk"
	delete "$SMPROGRAMS\${APPNAME} ${VERSIONNUMBER}.lnk"
	 Push "$INSTDIR"		#Delete instdir only if empty after installed filed has been deleted
	Call un.isEmptyDir
	Pop $0
	 StrCmp $0 1 0 +2
	rmdir "$INSTDIR" 
	DeleteRegKey HKCU "Software\classes\.acat"
	DeleteRegKey HKCU "Software\classes\.scat"
	DeleteRegKey HKCU "Software\classes\.antar"
	DeleteRegKey HKCU "Software\classes\.antpack"
	DeleteRegKey HKCU "Software\classes\.ado"
	DeleteRegKey HKCU "Software\classes\AntaresDataOrgAntar"
	DeleteRegKey HKCU "Software\classes\AntaresDataOrgCat"
	DeleteRegKey HKCU "Software\classes\AntaresDataOrgPack"
	DeleteRegKey HKCU "Software\classes\AntaresDataOrgAdo"
	DeleteRegKey HKCU "Software\classes\Directory\Shell\ado"
${EndIf}
SectionEnd


