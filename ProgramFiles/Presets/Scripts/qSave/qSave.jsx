// SCRIPT NAME: qSave
var VERSION="2.4";	// only used for UI dialogue
// AUTHOR: Ariel Chai
// CREDIT: James A. Taylor for core implementation of vTools.
// DESCRIPTION: Quick save script of .psd -> .tga


// VARIABLES

//Preference file variables
var prefs,prefPath,prefFile,keys,gVersion;

// Globals vars (stored in file preferences)
var gFormat, gDepth, gHideUvs, gMips, gPath;
var gAppend = new Array(8);
var gDepths = new Array(8);
var gLayername = new Array(8);

// PSD prefs (stored along with PSD)
var pGlobalFormat, pFormat, pGlobalPath, pPath;
var pGlobal = new Array(8);			// Actually stored via append keyword ( * )
var pAppend = new Array(8);
var pDepths = new Array(8);
var pLayername = new Array(8);		// Actually stored via append keyword ( ? )

// File prefs (final variables used for actual export)
var fFormat, fPath;
var fAppend = new Array(8);
var fDepths = new Array(8); fDepths[0] = 1;
var fLayername = new Array(8);

var thepsd;
// Loaded Settings (to be removed)
var fileAppend;
var fileDepth;
var uvsVisible = false;
var rgbLayer;

#target photoshop
app.bringToFront();

//Get the whole thing moving
main();

//Main

function main()	{
	// Reference for psd if any documents are open
	if (app.documents.length >= 1) { thepsd=activeDocument; }

	// Load global settings
	loadGlobalPrefs();
	
	// If there's an open document, load psd settings, otherwise grey the global thing out
	if (app.documents.length >= 1) { loadPSDPrefs(); }
	
	// check if script is feed fileappend to run save image instead.
	if(typeof(appendType) === 'undefined') {
		setupUI();
		if (app.documents.length >= 1) { freezeGlobals(); }			// If no active document (PSD) we freeze the globals
		//fileappend = "";
	} else {
		if (app.documents.length >= 1) {
			if (gHideUvs) toggleUvs();
			
			if (toggleRGBA() == false)			// RGB/A split, if in A parent with no RGB siblings, will copy to alpha only and not save image
				return;
			
			saveImage();
			if (gHideUvs) { toggleUvs(); }	// Toggle uvs layer visibility back if needed
			hideRGB();						// Hide RGB layer back, only when applicable (e.g. alpha export
		} else {
			alert("Dear Sir/Madame, no document open to save from.","ERROR: Required parameters not met");
		}
	}

}

// Load global preferences from file
// (not backward compatible, because it takes 2 minutes to set things back)
function loadGlobalPrefs() {

	//create the defaults - this way if the user has an older version of the file they can still use the script with new options just using the defaults
	defaultGlobalPrefs(); 
	
	//set prefpath to point to the users Application Data folder, or local OS equivalent
	prefPath=Folder.userData;
	//set it to point to the qSaveScriptPrefs folder within the users Application Data Folder
	prefPath=new Folder(prefPath+"/Photoshop_qPrefs");
	//set preffile to point to the preferences file within the prefpath 
	prefFile=new File(prefPath+"/qSave_prefs.jtp");
	//check if the path exists
	if (prefPath.exists) {
		if (prefFile.exists) {
			//open the preference file
			prefFile.open("r");
			prefs=prefFile.read()
			//split the resulting string into an array
			prefs=prefs.toString();
			//firstly, see if the existing preferences are current for version 3.5 or above (prefs version 2), use the defaults if they aren't.
			if (prefs.indexOf("gVersion = 1.3")==-1) 
				{
				alert("Default preferences from versions of qSave prior to 1.3 are incompatible with this version.\nReseting to defaults, please recreate your default preferences manually.","ERROR: Old Preferences Found");
				//set the prefs version back to two now we've avoided the eval
				gVersion=1.3;
				}
			else {eval(prefs)};
			prefFile.close();
		} else {defaultGlobalPrefs();}
	}
	//if the path didn't exist, create it
	else {
		prefPath.create();
		defaultPrefs();
	}
	//Now take that preference data and do something useful with it.
	//sortprefs();
	
	// load global vars to final file		 (will be overrided later by psdl prefs)
	fFormat = gFormat;
	fPath = gPath;
	for (i=0; i<=7; i++) { 
		fAppend[i] = gAppend[i];
		fDepths[i] = gDepths[i]; 
		fLayername[i] = gLayername[i];
	}

	// Defaults - Set all globals on <- we do this here instead of PSD, in case no PSD is open
	pGlobalFormat = true;
	pGlobalPath = true;	
	for (i=0; i<=7; i++) { 
		pGlobal[i] = true;
		pPath = "*";
		pAppend[i] = "*";	// default set to global			
		pDepths[i] = "*";
	}
	
}

// Load default global settings
function defaultGlobalPrefs() {
	gVersion = 1.3;				// preference version, not necessarily associated with the plugin version
	gFormat = 1;				// 0=TGA, 1=PNG, 2=BMP, 3=TIF, 4=DXT1, 5=DXT3, 6=DXT5, 7=DXT5-NM, 8=SuperPNG
	gDepth = 0;					// 0=24BIT, 1=32BIT
	gHideUvs = false;			// default off, we don't know what user wants
	gMips = false;			// default off, we don't know what user wants
	gPath = "";					// default "same as psd"
	//gPath = "Same as PSD...";	// 
	gAppend[0] = "_diffuse";
	gAppend[1] = "_specular";
	gAppend[2] = "_normal";
	gAppend[3] = "_opacity";
	gAppend[4] = "_glow";
	gAppend[5] = "";
	gAppend[6] = "";
	gAppend[7] = "";
	for (i=0; i<=7; i++) { 
		gDepth[i] = 2; 			// default to "same"
		gLayername[i] = false;
	}
}

// This loads the PSD's keywords  (file->info) into the preferences.
// Backward compatible for artists sanity
// Only load if first entry is a match, that way for mismatch with other versions (or just corrupt data) we just completely disregard data to avoid errors
function loadPSDPrefs() {

	// Load psd settings via keywords
	var keys=thepsd.info.keywords;
	
	if (keys[0] == "qSave 1.4") {
		
		// Format
		if ( (typeof(keys[1]) != 'undefined') && (keys[1] != '*') ) {
			pGlobalFormat = false; 
			pFormat = parseInt(keys[1]);
			fFormat = pFormat; 
		}
		
		// Path
		if ( (typeof(keys[3]) != 'undefined') && (keys[3] != '*') ) {
			pGlobalPath = false; 
			pPath = keys[3];
			fPath = pPath; 
		}
		
		// Appends & Depth - only load append/depths values if both are set properly (and not global)
		for (i=0; i<=7; i++) { 
			if ( ( (typeof(keys[4+i]) != 'undefined') && (keys[4+i] != '*') ) && ( (typeof(keys[12+i]) != 'undefined') && (keys[12+i] != '*') ) ) {			
				pGlobal[i] = false;
				pAppend[i] = keys[4+i];
				pDepths[i] = keys[12+i];
				fAppend[i] = pAppend[i];
				fDepths[i] = pDepths[i];
				if (keys[4+i] == '?') {
					pLayername[i] = true;
					fLayername[i] = true;
				} else {
					pLayername[i] = false;
					fLayername[i] = false;				
				}
			}
		}

	}
}

// Doesn't work -> js doesn't support pointers
/*function loadPSDCheckGlobal (keyVar, globalVar, pVar, fVar) {
	pVar.item = keyVar;		// we load this regardless of anything, to keep as reference
	if (typeof(keyVar == 'undefined')) {
		pVar = "*";
	} else if (kVar != '*') { 
		globalVar = false;
		fVar = pVar;
	}	
}*/

// If not document is open we set globals on and grey them out, since there's no local file to operate on
function freezeGlobals() {
	for (i=0; i<=7; i++) { 
		uGlobal[0].value = true;
		uGlobal[0].enabled = false;
	}
}

function saveGlobalPrefs() {

	// Copy value if global is checked
	if (pGlobalFormat) { gFormat = fFormat; }
	if (pGlobalPath) { gPath = fPath; }
	for (i=0; i<=7; i++) { 
		if (pGlobal[i]) { 
			gAppend[i] = fAppend[i]; 
			gDepths[i] = fDepths[i];
			gLayername[i] = fLayername[i];
		}
	}

	//alert (gDepths[2]);
	//alert(fDepths[0]);
	//alert(gDepths[0]);
	
	// Copy the pref variables into saveprefs - add the setting variables, then the file appends.
	var saveprefs='gVersion = 1.3;\ngFormat = ' +gFormat+ ';\ngDepth = ' +gDepth+ ';\ngHideUvs = ' +gHideUvs+  ';\ngMips= ' +gMips+ ';\ngPath = \"' +safePath(gPath)+ '\";';
	var saveprefs=saveprefs+'\ngAppend[0] = \"' +gAppend[0]+ '\";\ngAppend[1] = \"' +gAppend[1]+ '\";\ngAppend[2] = \"' +gAppend[2]+ '\";\ngAppend[3] = \"' +gAppend[3]+ '\";';
	var saveprefs=saveprefs+'\ngAppend[4] = \"' +gAppend[4]+ '\";\ngAppend[5] = \"' +gAppend[5]+ '\";\ngAppend[6] = \"' +gAppend[6]+ '\";\ngAppend[7] = \"' +gAppend[7]+ '\";';
	var saveprefs=saveprefs+'\ngDepths[0] = \"' +gDepths[0]+ '\";\ngDepths[1] = \"' +gDepths[1]+ '\";\ngDepths[2] = \"' +gDepths[2]+ '\";\ngDepths[3] = \"' +gDepths[3]+ '\";';
	var saveprefs=saveprefs+'\ngDepths[4] = \"' +gDepths[4]+ '\";\ngDepths[5] = \"' +gDepths[5]+ '\";\ngDepths[6] = \"' +gDepths[6]+ '\";\ngDepths[7] = \"' +gDepths[7]+ '\";';
	var saveprefs=saveprefs+'\ngLayername[0] = ' +gLayername[0]+ ';\ngLayername[1] = ' +gLayername[1]+ ';\ngLayername[2] = ' +gLayername[2]+ ';\ngLayername[3] = ' +gLayername[3]+ ';';
	var saveprefs=saveprefs+'\ngLayername[4] = ' +gLayername[4]+ ';\ngLayername[5] = ' +gLayername[5]+ ';\ngLayername[6] = ' +gLayername[6]+ ';\ngLayername[7] = ' +gLayername[7]+ ';';
	//then open the file, destroying the contents,
	prefFile.open("w");
	//then write the prefs to the file and close it.
	prefFile.write(saveprefs);
	prefFile.close();
}

// Save preferences into PSD keywords (file-info)
function savePSDPrefs() {

	// Header
	keywordarray=new Array();
	keywordarray[0] = "qSave 1.4";
	//keywordarray[1] = "*";		// file type (reserved for now)
	keywordarray[1] = savePSDCheckGlobal(pGlobalFormat, fFormat);
	keywordarray[2] = "*";		// file depth (reserved for now)
	
	// File path
	keywordarray[3] = savePSDCheckGlobal(pGlobalPath, fPath);
	/*if ((fPath != "Same as PSD...") && (typeof(fPath) != 'undefined')) {
		keywordarray[3] = fPath;	// target path
	} else {
		keywordarray[3] = "";	// target path
	}*/
	
	//alert(fDepths[0]);
	//alert(gDepths[0]);
	
	// File appends & bitdepths
	for (i=0; i<=7; i++) { 
		//keywordarray[4+i] = savePSDCheckGlobal(pGlobal[i], fAppend[i]); 
		if (!pGlobal[i]) { keywordarray[4+i] = savePSDCheckLayername(fLayername[i], fAppend[i]); }
		else { keywordarray[4+i] = savePSDCheckGlobal(pGlobal[i], fAppend[i]); }
	}
	for (i=0; i<=7; i++) { keywordarray[12+i] = savePSDCheckGlobal(pGlobal[i], fDepths[i]); }

	//for (i=0; i<=7; i++) { keywordarray[4+i] = savePSDCheckLayername(pLayername[i], keywordarray[4+i]); }		// We don't want to override if it was already set to global
	
	// Save array into keywords
	thepsd.info.keywords = keywordarray;

}

// Check if global is ticked for preference, return "*" instead of value
function savePSDCheckGlobal(globalVar, readVar) {
	if (globalVar) {
		return "*";
	} else {
		return readVar;
	}
}

// Check if layername is ticked for preference, return "?" instead of value
function savePSDCheckLayername(layernameVar, readVar) {
	if (layernameVar) {
		return "?";
	} else {
		return readVar;
	}
}

// Store UI into interchangable variables (global,psd,file)
function storeUI() {
	fFormat = uFormat.selection.index;
	pGlobalFormat = uGlobalFormat.value;
	//gDepth=uDepth.selection.index;
	gHideUvs=uHideUvs.value;
	gMips=uMips.value;
	fPath=uPath.text;
	if (uPath.text == "Same as PSD...") { fPath = ""; }
	pGlobalPath=uGlobalPath.value;
	
	for (i=0; i<=7; i++) { 
		fAppend[i] = uAppend[i].text;
		fDepths[i] = uDepths[i].selection.index;
		fLayername[i] = uLayername[i].value;
		pGlobal[i] = uGlobal[i].value;
	}
	
}

// Setup UI based on global/psd prefs
function loadUI() {
	uFormat.selection = fFormat;
	uGlobalFormat.value = pGlobalFormat;
	//uDepth.selection = gDepth;
	uHideUvs.value = gHideUvs;
	uMips.value = gMips;
	uPath.text = fPath;
	uPath.text = UIPathCheckBlank(fPath);
	uGlobalPath.value = pGlobalPath;
	
	for (i=0; i<=7; i++) { 
		uAppend[i].text = fAppend[i];
		uDepths[i].selection = fDepths[i];
		uLayername[i].value = fLayername[i];
		uGlobal[i].value = pGlobal[i];			// Entry's global only stored with actual PSD
	}

	for (i=0; i<=7; i++) { 
		if (uLayername[i].value) { 
			uAppend[i].enabled = false;
			//uAppend[i].name = "Uses layer name";
		}
	}
	
	if (app.documents.length == 0) {
		uGlobalPath.enabled = false;
		for (i=0; i<=7; i++) { 
			uGlobal[i].enabled = false;
		}
	}
	
}

function setupUI() {
	setupmainwindow = 
	"dialog { text: 'qSave', orientation: 'column' \
	, mainpanel: Group {orientation: 'column' \
			, div1: Group {orientation: 'row', alignment:'center' \
				, divider1: Panel {orientation: 'row', alignment:'center', preferredSize:[390,2] \
				, properties: {borderStyle: 'black'} \
				}\
			}\
			, formatgroup: Group {orientation:'column',alignment:'left', preferredSize:[245,20] \
				, formatgroup1: Group {orientation:'row', alignment:'left' \
					, formattext: StaticText {text: 'Format:'} \
					, format: DropDownList {helpTip:'Choose file format for export.' , properties:{items:['TGA','PNG','BMP','TIF','DXT1','DXT3','DXT5','DXT5NM','SuperPNG','DDS8888']} } \
					, globalformat: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
					, hideuvs: Checkbox {text:'Hide Uvs', value: false, helpTip:'Automatically hide top-layer named uv uvs on export. (this setting is always global)'} \
					, mips: Checkbox {text:'Mips', value: false, helpTip:'Enable MipMaps (DDS export only). (this setting is always global)'} \
				}\
			}\
			, pathgroup: Group {orientation:'row',alignment:'left' \
					, pathtext: StaticText {text:'Export Path:', preferredSize:[70,20]}\
					, path: EditText {text:'Same as PSD...', alignment:'left', preferredSize:[240,20], helpTip:'Export textures to this directory. leave blank to use PSDs path.',} \
					, globalpath: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, div2: Group {orientation: 'row', alignment:'center' \
				, divider2: Panel {orientation: 'row', alignment:'center', preferredSize:[390,2] \
				, properties: {borderStyle: 'black'} \
				}\
			}\
			, apn01group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave01:', preferredSize:[60,20]}\
				, append01: EditText {text:'_diffuse', alignment:'left', preferredSize:[120,20], helpTip:'When qSave01 is run, this text will be appended at the end of the .tga file.',} \
				, depth01: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit','main']} } \
				, layername01: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global01: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn02group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave02:', preferredSize:[60,20]}\
				, append02: EditText {text:'_specular', alignment:'left', preferredSize:[120,20], helpTip:'When qSave02 is run, this text will be appended at the end of the .tga file.',} \
				, depth02: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername02: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file, based on selected layer.'} \
				, global02: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn03group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave03:', preferredSize:[60,20]}\
				, append03: EditText {text:'_normal', alignment:'left', preferredSize:[120,20], helpTip:'When qSave03 is run, this text will be appended at the end of the .tga file.',} \
				, depth03: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername03: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global03: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn04group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave04:', preferredSize:[60,20]}\
				, append04: EditText {text:'_opacity', alignment:'left', preferredSize:[120,20], helpTip:'when qSave04 is run, this text will be appended at the end of the .tga file.',} \
				, depth04: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername04: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global04: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn05group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave05:', preferredSize:[60,20]}\
				, append05: EditText {text:'', alignment:'left', preferredSize:[120,20], helpTip:'when qSave05 is run, this text will be appended at the end of the .tga file.',} \
				, depth05: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername05: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global05: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn06group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave06:', preferredSize:[60,20]}\
				, append06: EditText {text:'', alignment:'left', preferredSize:[120,20], helpTip:'when qSave06 is run, this text will be appended at the end of the .tga file.',} \
				, depth06: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername06: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global06: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn07group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave07:', preferredSize:[60,20]}\
				, append07: EditText {text:'', alignment:'left', preferredSize:[120,20], helpTip:'when qSave07 is run, this text will be appended at the end of the .tga file.',} \
				, depth07: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername07: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global07: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, apn08group: Group {orientation: 'row', alignment:'left' \
				, ntext: StaticText {text:'qSave08:', preferredSize:[60,20]}\
				, append08: EditText {text:'', alignment:'left', preferredSize:[120,20], helpTip:'when qSave08 is run, this text will be appended at the end of the .tga file.',} \
				, depth08: DropDownList {helpTip:'Choose bit depth for specific export.' , properties:{items:['24bit','32bit']} } \
				, layername08: Checkbox {text:'Layer Name', value:false, helpTip:'Name exported file based on selected layer.'} \
				, global08: Checkbox {text:'Global', value:false, helpTip:'Unchecking global will save this setting with the PSD.'} \
			}\
			, div9: Group {orientation: 'row', alignment:'center' \
				, divider9: Panel {orientation: 'row', alignment:'center', preferredSize:[390,2] \
				, properties: {borderStyle: 'sunken'} \
				}\
			}\
		}\
		, btngroup: Group { orientation:'row', alignment:'center', alignclildren:'center' \
			, savebtn: Button { text:'Save Preferences', helpTip:'Save the above global/psd preferences.'} \
			, buttonsplit1: StaticText { text:'', preferredSize:[150,20]} \
			, clbtn: Button { text:'Cancel', helpTip:'Exit the script and take no action at all. This will not revert saved preferences and any unsaved preferences will be lost.'} \
		}\
	}";

	//initialise the window
	mainwindow = new Window(setupmainwindow);
	//copy the version number into the window title
	//mainwindow.text=mainwindow.text+" v" + VERSION.toFixed(1);	 // make sure version is displayed with 1 decimal place
	mainwindow.text=mainwindow.text+" v" + VERSION;	 // make sure version is displayed with 1 decimal place
	
	//set up variables for each useable UI component:
	uFormat		= mainwindow.mainpanel.formatgroup.formatgroup1.format;
	//uDepth		= mainwindow.mainpanel.formatgroup.formatgroup1.depth;
	uGlobalFormat = mainwindow.mainpanel.formatgroup.formatgroup1.globalformat;
	uHideUvs	= mainwindow.mainpanel.formatgroup.formatgroup1.hideuvs;
	uMips		= mainwindow.mainpanel.formatgroup.formatgroup1.mips;
	uPath		= mainwindow.mainpanel.pathgroup.path;
	uGlobalPath	= mainwindow.mainpanel.pathgroup.globalpath;
	uAppend = new Array(8);
	uDepths = new Array(8); uDepths[0] = 0;
	uGlobal = new Array(8);
	uLayername = new Array(8);
	uAppend[0]	= mainwindow.mainpanel.apn01group.append01;
	uAppend[1]	= mainwindow.mainpanel.apn02group.append02;
	uAppend[2]	= mainwindow.mainpanel.apn03group.append03;
	uAppend[3]	= mainwindow.mainpanel.apn04group.append04;
	uAppend[4]	= mainwindow.mainpanel.apn05group.append05;
	uAppend[5]	= mainwindow.mainpanel.apn06group.append06;
	uAppend[6]	= mainwindow.mainpanel.apn07group.append07;
	uAppend[7]	= mainwindow.mainpanel.apn08group.append08;
	uDepths[0]	= mainwindow.mainpanel.apn01group.depth01;
	uDepths[1]	= mainwindow.mainpanel.apn02group.depth02;
	uDepths[2]	= mainwindow.mainpanel.apn03group.depth03;
	uDepths[3]	= mainwindow.mainpanel.apn04group.depth04;
	uDepths[4]	= mainwindow.mainpanel.apn05group.depth05;
	uDepths[5]	= mainwindow.mainpanel.apn06group.depth06;
	uDepths[6]	= mainwindow.mainpanel.apn07group.depth07;
	uDepths[7]	= mainwindow.mainpanel.apn08group.depth08;
	uGlobal[0]  = mainwindow.mainpanel.apn01group.global01;
	uGlobal[1]   = mainwindow.mainpanel.apn02group.global02;
	uGlobal[2]   = mainwindow.mainpanel.apn03group.global03;
	uGlobal[3]   = mainwindow.mainpanel.apn04group.global04;
	uGlobal[4]   = mainwindow.mainpanel.apn05group.global05;
	uGlobal[5]   = mainwindow.mainpanel.apn06group.global06;
	uGlobal[6]   = mainwindow.mainpanel.apn07group.global07;
	uGlobal[7]   = mainwindow.mainpanel.apn08group.global08;
	uLayername[0]   = mainwindow.mainpanel.apn01group.layername01;
	uLayername[1]   = mainwindow.mainpanel.apn02group.layername02;
	uLayername[2]   = mainwindow.mainpanel.apn03group.layername03;
	uLayername[3]   = mainwindow.mainpanel.apn04group.layername04;
	uLayername[4]   = mainwindow.mainpanel.apn05group.layername05;
	uLayername[5]   = mainwindow.mainpanel.apn06group.layername06;
	uLayername[6]   = mainwindow.mainpanel.apn07group.layername07;
	uLayername[7]   = mainwindow.mainpanel.apn08group.layername08;
	//uLayername[1]   = mainwindow.mainpanel.apn02group.layername02;
	//uLayername[1]   = mainwindow.mainpanel.apn02group.layername02;
	usavebtn	= mainwindow.btngroup.savebtn;
	//usavepsdbtn	= mainwindow.btngroup.savepsdbtn;
	
	// set function for "save prefs" button
	usavebtn.onClick=function()	{
		storeUI();	// translate UI to variables for export
		saveGlobalPrefs();
		if (app.documents.length >= 1) { savePSDPrefs(); }
		mainwindow.close();
		//alert("The preferences were saved.","CONFIRMATION");
	}
	
	// grey out depth on png, and re-enable on other formats
	/*uFormat.onChange=function() {
		if (uFormat.selection == 1) {
			uDepth.enabled = false;
			mainwindow.mainpanel.formatgroup.formatgroup1.depthtext.enabled = false;
		} else {
			uDepth.enabled = true;
			mainwindow.mainpanel.formatgroup.formatgroup1.depthtext.enabled = true;		
		}
	}*/

	// Path show "same as PSD" if cleared
	uPath.onChange=function() { uPath.text = UIPathCheckBlank(uPath.text); }
	
	// Global checkboxes (safety)
	uGlobalFormat.onClick=function() { UICheckBoxFormat(); }
	uGlobalPath.onClick=function() { UICheckBoxPath(); }
	uGlobal[0].onClick=function() { UICheckBoxAppend(0); }		// need to do this manually, doesn't work in a for loop
	uGlobal[1].onClick=function() { UICheckBoxAppend(1); }
	uGlobal[2].onClick=function() { UICheckBoxAppend(2); }
	uGlobal[3].onClick=function() { UICheckBoxAppend(3); }
	uGlobal[4].onClick=function() { UICheckBoxAppend(4); }
	uGlobal[5].onClick=function() { UICheckBoxAppend(5); }
	uGlobal[6].onClick=function() { UICheckBoxAppend(6); }
	uGlobal[7].onClick=function() { UICheckBoxAppend(7); }
	uLayername[0].onClick=function() { UICheckBoxLayername(0); }
	uLayername[1].onClick=function() { UICheckBoxLayername(1); }
	uLayername[2].onClick=function() { UICheckBoxLayername(2); }
	uLayername[3].onClick=function() { UICheckBoxLayername(3); }
	uLayername[4].onClick=function() { UICheckBoxLayername(4); }
	uLayername[5].onClick=function() { UICheckBoxLayername(5); }
	uLayername[6].onClick=function() { UICheckBoxLayername(6); }
	uLayername[7].onClick=function() { UICheckBoxLayername(7); }
	
	// Hide mips for non DDS
	uFormat.onChange = function() {
		fVal = uFormat.selection.index;
		if (((fVal >= 4) && (fVal <= 7)) || (fVal == 9)) {
			uMips.enabled = true;
		} else {
			uMips.enabled = false;
		}
	}
	
	// load prefs to UI
	//uformat.selection=0;
	loadUI();
	
	//open the window
	mainwindow.center(); mainresult=mainwindow.show();
	//if cancel button was pressed
	//if (mainresult==4) return;	
	
	// Legacy - depth used to come after format in UI, pretty useless in current version
	//					, depthtext: StaticText {text: 'Depth:'} \
	//					, depth: DropDownList {helpTip:'Choose main bit depth for export.' , properties:{items:['24bit','32bit']} } \

}

// If path variable is blank, returns it with "same as psd" text, otherwise returns the same variable. 
function UIPathCheckBlank(pathText) {
	if (pathText == "")
		return "Same as PSD...";
	else
		return pathText;
}

function UICheckBoxFormat() {
	if (uGlobalFormat.value == true) {
		pFormat = uFormat.selection.index;		// store current to psd var
		//uFormat.selection = UIPathCheckBlank(gPath);
		uFormat.selection = gFormat;
	} else {
		if (pFormat != '*') {
			gFormat = uFormat.selection.index;		// store current to global var
			//uFormat.selection = UIPathCheckBlank(pPath);
			uFormat.selection.index = pFormat;
		}
	}
}

function UICheckBoxPath() {
	if (uGlobalPath.value == true) {
		pPath = uPath.text;		// store current to psd var
		uPath.text = UIPathCheckBlank(gPath);
	} else {
		if (pPath != '*') {
			gPath = uPath.text;		// store current to global var
			uPath.text = UIPathCheckBlank(pPath);
		}
	}
}

// Switch between local /global append
function UICheckBoxAppend(j) {
	if (uGlobal[j].value == true) {
		if (uAppend[j].text != gAppend[j]) {
			pAppend[j] = uAppend[j].text			// store current to pVar	
		}
		uAppend[j].text = gAppend[j];
		pDepths[j] = uDepths[j].selection.index;	// store current to pVar
		uDepths[j].selection = gDepths[j];			// retrieve global
		uLayername[j].value = gLayername[j];
	} else {
		if (pAppend[j] != '*') {
			gAppend[j] = uAppend[j].text			// store current to pVar	
			uAppend[j].text = pAppend[j];			
		}
		if (pDepths[j] != '*') {
			gDepth[j] = uDepths[j].selection.index;	// store current to gVar			
			uDepths[j].selection = pDepths[j];			
		}
	}
}

// Toggle between manual append name, and automatic based on layername
function UICheckBoxLayername(j) {
	if (uLayername[j].value == true) {
		uAppend[j].enabled = false;
	} else {
		uAppend[j].enabled = true;		
		if (uAppend[j].text == '?') { uAppend[j].text = ""; 
		}
	}
}

// Get all parameters and save out image
function saveImage() {
	// check if there are actually any documents open on which to perform the action
	if (documents.length <= 0) {
		alert("Dear Sir/Madame, the script requires a document to save.","ERROR: Required parameters not met");
		return;
	}

	// load the append type
	switch(appendType) {
		case 1 : fileAppend = fAppend[0]; fileDepth = fDepths[0]; fileLayername = fLayername[0]; break;
		case 2 : fileAppend = fAppend[1]; fileDepth = fDepths[1]; fileLayername = fLayername[1]; break;
		case 3 : fileAppend = fAppend[2]; fileDepth = fDepths[2]; fileLayername = fLayername[2]; break;
		case 4 : fileAppend = fAppend[3]; fileDepth = fDepths[3]; fileLayername = fLayername[3]; break;
		case 5 : fileAppend = fAppend[4]; fileDepth = fDepths[4]; fileLayername = fLayername[4]; break;
		case 6 : fileAppend = fAppend[5]; fileDepth = fDepths[5]; fileLayername = fLayername[5]; break;
		case 7 : fileAppend = fAppend[6]; fileDepth = fDepths[6]; fileLayername = fLayername[6]; break;
		case 8 : fileAppend = fAppend[7]; fileDepth = fDepths[7]; fileLayername = fLayername[7]; break;
		default : fileAppend = ""; fileDepth = 2; fileLayername = false; break;
	}

	// Get the path and name of file
	psdname=activeDocument.name;
	checkpsd(); // check if document has been saved as psd
	/*psdpath=activeDocument.path;
	if ( (typeof(fPath) != 'undefined') && (fPath != "Same as PSD...") && (fPath != "") ) {	// user specified path overrides PSDs
		//psdpath = fPath;
		psdpath = processPath(psdpath, fPath);
	}*/
	exportPath = processPath (fPath);					// export path
	layerName = activeDocument.activeLayer.name;
	filename = psdname.slice(0,psdname.length - 4);		// PSD path
	
	// Auto name based on selected layer
	if (fileLayername) {			// Use layername for filename
		filename = layerName;
		fileAppend = "";
	} 
		
	// Check folder exists
	checkPath = new Folder(exportPath);
	//prefFile=new File(prefPath+"/qSave_prefs.jtp");
	if (!checkPath.exists) {
		//alert ("doesn't exist");
		alert ( "Failed export, path \"" + exportPath + "\" doesn't exist.","WARNING");
		return;
	}
		
	//alert(layerName);
	//filename = "test";
	//fileAppend = "";		
	
	fileExtension = ".tga";	// Default tga

	// Layer name
	
	
	// Depth
	var vDepth;
	//if (fileDepth == 2) { fileDepth = gDepth; }		// if set to "same" we just load the global depth
	if (fileDepth == 1) {
		vDepth = 32;
	} else {
		vDepth = 24;	// default
	}
	
	// Init image save
	var id1 = charIDToTypeID( "save" );
    var desc1 = new ActionDescriptor();
    var id2 = charIDToTypeID( "As  " );

	// Different Image Types
	switch(fFormat) {
		case 1:
			saveImagePNG(vDepth,desc1,id2);		// PNG
			fileExtension = ".png";
			break;
		case 2:
			saveImageBMP(vDepth,desc1,id2);		// BMP (thanks Talon)
			fileExtension = ".bmp";
			break;
		case 3:
			saveImageTIF(vDepth,desc1,id2);		// TIFF
			fileExtension = ".tif";
			break;
		case 4:
			saveImageDDS(vDepth,desc1,id2,1);	// DDS DXT1
			fileExtension = ".dds";
			break;
		case 5:
			saveImageDDS(vDepth,desc1,id2,2);	// DDS DXT3
			fileExtension = ".dds";
			break;
		case 6:
			saveImageDDS(vDepth,desc1,id2,3);	// DDS DXT5
			fileExtension = ".dds";
			break;
		case 7:
			saveImageDDS(vDepth,desc1,id2,4);	// DDS DXT5-NM
			fileExtension = ".dds";
			break;
		case 8:
			saveImageSuperPNG(vDepth,desc1,id2);		// SuperPNG
			fileExtension = ".png";
			break;
		case 9:
			saveImageDDS(vDepth,desc1,id2,5);	// DDS 8.8.8.8 ARGB
			fileExtension = ".dds";
			break;
		default:								// Default TGA
			saveImageTGA(vDepth,desc1,id2);
	}
	
	// Save Image
	var id3 = charIDToTypeID( "Cpy " );
	desc1.putBoolean( id3, true );
	var idPath = charIDToTypeID( "In  " );
	desc1.putPath( idPath, new File( exportPath + "/" + filename + fileAppend + fileExtension ) );
	executeAction( id1, desc1, DialogModes.NO );
	
}

// Save templates
function saveImageTGA(vDepth,desc1,id2) {
	var desc2 = new ActionDescriptor();
    var id3 = charIDToTypeID( "BtDp" );
    desc2.putInteger( id3, vDepth );
    var id4 = charIDToTypeID( "Cmpr" );
    desc2.putInteger( id4, 0 );
	var id5 = charIDToTypeID( "TrgF" );
	desc1.putObject( id2, id5, desc2 );
	//var id6 = charIDToTypeID( "Cpy " );
	//desc1.putBoolean( id6, true );
}

function saveImagePNG(vDepth,desc1,id2) {
	var desc2 = new ActionDescriptor();
	var id3 = charIDToTypeID( "PGIT" );
	var id4 = charIDToTypeID( "PGIT" );
	var id5 = charIDToTypeID( "PGIN" );		//  [PGIN] non interlaced 	[PGIA] interlaced
	desc2.putEnumerated( id3, id4, id5 );
	var id6 = charIDToTypeID( "PNGf" );
	var id7 = charIDToTypeID( "PNGf" );
	var id8 = charIDToTypeID( "PGAd" );
	desc2.putEnumerated( id6, id7, id8 );
	var id9 = charIDToTypeID( "PNGF" );
	desc1.putObject( id2, id9, desc2 );
}

function saveImageSuperPNG(vDepth,desc1,id2) {
	var desc2 = new ActionDescriptor();
	
	var quality = 2;
	var id14 = charIDToTypeID( "pngC" );
	var id15 = charIDToTypeID( "pngF" );
	var id16 = charIDToTypeID( "pngS" );
	switch(quality) {
	case 1:					// smallest file, lowest quality, fastest save
		desc2.putInteger( id14, 9 );		
		desc2.putInteger( id15, 248 );
		desc2.putInteger( id16, 0 );
		break;
	case 2:
		desc2.putInteger( id14, -1 );
		desc2.putInteger( id15, 248 );
		desc2.putInteger( id16, 0 );
		break;
	case 3:					
		desc2.putInteger( id14, -1 );
		desc2.putInteger( id15, 16 );
		desc2.putInteger( id16, 2 );
		break;
	default:				// largest file, highest quality, fastest save
		desc2.putInteger( id14, 0 );		
		desc2.putInteger( id15, 0 );
		desc2.putInteger( id16, 2 );
	}	
	
	var id17 = charIDToTypeID( "pngI" );		// interlace ?
	desc2.putBoolean( id17, false );
	var id18 = charIDToTypeID( "pngM" );		// metadata ?
	desc2.putBoolean( id18, true );
	var id19 = charIDToTypeID( "pngA" );
	var id20 = charIDToTypeID( "alfT" );		// transparency
	//var id20 = charIDToTypeID( "alfC" );		// alpha	
	
	if (vDepth == 32)
		var id21 = charIDToTypeID( "alfT" );	//  [alfT] transparency		[alfN]  no transparency 		
	else 
		var id21 = charIDToTypeID( "alfN" );
		
	desc2.putEnumerated( id19, id20, id21 );
	var id22 = stringIDToTypeID( "fnord SuperPNG" );
	desc1.putObject( id2, id22, desc2 );
}

function saveImageBMP(vDepth,desc1,id2) {
	vDepth = "BD" + vDepth;
	vDepth = charIDToTypeID( vDepth );	// default
	var desc2 = new ActionDescriptor();
	var id44 = charIDToTypeID( "Pltf" );
	var id45 = charIDToTypeID( "Pltf" );
	var id46 = charIDToTypeID( "Win " );
	desc2.putEnumerated( id44, id45, id46 );
	var id47 = charIDToTypeID( "BtDp" );
	var id48 = charIDToTypeID( "BtDp" );
	//desc2.putEnumerated( id47, id48, "24" );
	desc2.putEnumerated( id47, id48, vDepth );
	var id50 = charIDToTypeID( "Cmpr" );
	desc2.putBoolean( id50, false );
	var id51 = charIDToTypeID( "BMPF" );
	desc1.putObject( id2, id51, desc2 );
}

function saveImageTIF(vDepth,desc1,id2) {
	var desc2 = new ActionDescriptor();
	var id181 = charIDToTypeID( "BytO" );
	var id182 = charIDToTypeID( "Pltf" );
	var id183 = charIDToTypeID( "IBMP" );	
	desc2.putEnumerated( id181, id182, id183 );
    var id184 = charIDToTypeID( "TIFF" );
    desc1.putObject( id2, id184, desc2 );

	var idAlpC = charIDToTypeID( "AlpC" );			// Note if this isn't set, TIFF will automatically only save alpha if PSD has one (on CS5)
	var alpC = true
	if (vDepth == 24)
		alpC = false;
    desc1.putBoolean( idAlpC, alpC );
	
	var idLyrs = charIDToTypeID( "Lyrs" );			// no layers
    desc1.putBoolean( idLyrs, false );	
	
}

// DDS type  (1) DXT1 (2) DXT3 (3) DXT5 (4) DXT5-nm
function saveImageDDS(vDepth,desc1,id2,type) {

	// DDS compression settings
	var ddsTxfm = 3;
	switch(type) {
		case 1:					// DXT1 (RGB/ARGB)
			if (vDepth == 24)
				ddsTxfm = 0;
			else 
				ddsTxfm = 1;
			break;
		case 2:					// DXT3
			ddsTxfm = 2;
			break;
		case 4:					// DXT5-NM
			ddsTxfm = 24;
			break;
		case 5:					// 8.8.8.8 ARGB
			ddsTxfm = 7;
			break;
		default:				// Default DXT5
			ddsTxfm = 3;
	}	
	
	var mmty = 32;
	if (gMips) { mmty = 30; }
	
	// Feed data
	var desc4 = new ActionDescriptor();
	var id20 = charIDToTypeID( "barF" );
	desc4.putBoolean( id20, true );
	var id21 = charIDToTypeID( "fdev" );
	desc4.putDouble( id21, 3.000000 );
	var id22 = charIDToTypeID( "fbia" );
	desc4.putDouble( id22, 0.000000 );
	var id23 = charIDToTypeID( "urad" );
	desc4.putDouble( id23, 5.000000 );
	var id24 = charIDToTypeID( "uamo" );
	desc4.putDouble( id24, 0.500000 );
	var id25 = charIDToTypeID( "uthr" );
	desc4.putDouble( id25, 0.000000 );
	var id26 = charIDToTypeID( "xstf" );
	desc4.putDouble( id26, 1.000000 );
	var id27 = charIDToTypeID( "xthf" );
	desc4.putDouble( id27, 1.000000 );
	var id28 = charIDToTypeID( "qual" );
	desc4.putInteger( id28, 71 );
	var id29 = charIDToTypeID( "erdi" );
	desc4.putBoolean( id29, false );
	var id30 = charIDToTypeID( "erdw" );
	desc4.putInteger( id30, 1 );
	var id31 = charIDToTypeID( "usfa" );
	desc4.putBoolean( id31, false );
	
	var id32 = charIDToTypeID( "txfm" );
	//desc4.putInteger( id32, 0 );
	desc4.putInteger( id32, ddsTxfm );
	
	var id33 = charIDToTypeID( "weig" );
	desc4.putInteger( id33, 0 );
	var id34 = charIDToTypeID( "tmty" );
	desc4.putInteger( id34, 0 );
	var id35 = charIDToTypeID( "mmty" );		
	desc4.putInteger( id35, mmty );
	//desc4.putInteger( id35, 32 );							// [30/32] enable/disable mipmaps
	var id36 = charIDToTypeID( "smip" );
	desc4.putInteger( id36, 0 );
	var id37 = charIDToTypeID( "bina" );
	desc4.putBoolean( id37, false );
	var id38 = charIDToTypeID( "prem" );
	desc4.putBoolean( id38, false );
	var id39 = charIDToTypeID( "film" );
	desc4.putBoolean( id39, false );
	var id40 = charIDToTypeID( "alpb" );
	desc4.putBoolean( id40, false );
	var id41 = charIDToTypeID( "bord" );
	desc4.putBoolean( id41, false );
	var id42 = charIDToTypeID( "brdr" );
	desc4.putDouble( id42, 0.000000 );
	var id43 = charIDToTypeID( "brdg" );
	desc4.putDouble( id43, 0.000000 );
	var id44 = charIDToTypeID( "brdb" );
	desc4.putDouble( id44, 0.000000 );
	var id45 = charIDToTypeID( "mmft" );
	desc4.putInteger( id45, 2 );
	var id46 = charIDToTypeID( "fdcl" );
	desc4.putBoolean( id46, false );
	var id47 = charIDToTypeID( "fdaf" );
	desc4.putBoolean( id47, false );
	var id48 = charIDToTypeID( "f2rl" );
	desc4.putDouble( id48, 0.500000 );
	var id49 = charIDToTypeID( "f2gl" );
	desc4.putDouble( id49, 0.500000 );
	var id50 = charIDToTypeID( "f2bl" );
	desc4.putDouble( id50, 0.500000 );
	var id51 = charIDToTypeID( "f2al" );
	desc4.putDouble( id51, 0.500000 );
	var id52 = charIDToTypeID( "fddl" );
	desc4.putInteger( id52, 0 );
	var id53 = charIDToTypeID( "fafm" );
	desc4.putDouble( id53, 0.150000 );
	var id54 = charIDToTypeID( "bafh" );
	desc4.putDouble( id54, 0.000000 );
	var id55 = charIDToTypeID( "dthc" );
	desc4.putBoolean( id55, false );
	var id56 = charIDToTypeID( "dth0" );
	desc4.putBoolean( id56, false );
	var id57 = charIDToTypeID( "smth" );
	desc4.putInteger( id57, 0 );
	var id58 = charIDToTypeID( "filg" );
	desc4.putDouble( id58, 2.200000 );
	var id59 = charIDToTypeID( "fieg" );
	desc4.putBoolean( id59, false );
	var id60 = charIDToTypeID( "filw" );
	desc4.putDouble( id60, 10.000000 );
	var id61 = charIDToTypeID( "over" );
	desc4.putBoolean( id61, false );
	var id62 = charIDToTypeID( "fblr" );
	desc4.putDouble( id62, 1.000000 );
	var id63 = charIDToTypeID( "nmcv" );
	desc4.putBoolean( id63, false );
	var id64 = charIDToTypeID( "ncnv" );
	desc4.putInteger( id64, 1009 );
	var id65 = charIDToTypeID( "nflt" );
	desc4.putInteger( id65, 1040 );
	var id66 = charIDToTypeID( "nmal" );
	desc4.putInteger( id66, 1034 );
	var id67 = charIDToTypeID( "nmbr" );
	desc4.putBoolean( id67, false );
	var id68 = charIDToTypeID( "nmix" );
	desc4.putBoolean( id68, false );
	var id69 = charIDToTypeID( "nmiy" );
	desc4.putBoolean( id69, false );
	var id70 = charIDToTypeID( "nmiz" );
	desc4.putBoolean( id70, false );
	var id71 = charIDToTypeID( "nmah" );
	desc4.putBoolean( id71, false );
	var id72 = charIDToTypeID( "nswp" );
	desc4.putBoolean( id72, false );
	var id73 = charIDToTypeID( "nmsc" );
	desc4.putDouble( id73, 2.200000 );
	var id74 = charIDToTypeID( "nmnz" );
	desc4.putInteger( id74, 0 );
	var id75 = charIDToTypeID( "usbi" );
	desc4.putBoolean( id75, false );
	var id76 = charIDToTypeID( "lien" );
	desc4.putBoolean( id76, false );
	var id77 = charIDToTypeID( "shdi" );
	desc4.putBoolean( id77, false );
	var id78 = charIDToTypeID( "shfi" );
	desc4.putBoolean( id78, false );
	var id79 = charIDToTypeID( "shmm" );
	desc4.putBoolean( id79, true );
	var id80 = charIDToTypeID( "shan" );
	desc4.putBoolean( id80, true );
	var id81 = charIDToTypeID( "clrc" );
	desc4.putInteger( id81, 0 );
	var id82 = charIDToTypeID( "vdx1" );
	desc4.putBoolean( id82, true );
	var id83 = charIDToTypeID( "vdx2" );
	desc4.putBoolean( id83, true );
	var id84 = charIDToTypeID( "vdx3" );
	desc4.putBoolean( id84, true );
	var id85 = charIDToTypeID( "vdx5" );
	desc4.putBoolean( id85, true );
	var id86 = charIDToTypeID( "v444" );
	desc4.putBoolean( id86, true );
	var id87 = charIDToTypeID( "v555" );
	desc4.putBoolean( id87, true );
	var id88 = charIDToTypeID( "v565" );
	desc4.putBoolean( id88, true );
	var id89 = charIDToTypeID( "v888" );
	desc4.putBoolean( id89, true );
	var id90 = charIDToTypeID( "alph" );
	desc4.putBoolean( id90, false );
	var id91 = charIDToTypeID( "usra" );
	desc4.putBoolean( id91, false );
	var id92 = charIDToTypeID( "usfs" );
	desc4.putInteger( id92, 0 );
	var id93 = charIDToTypeID( "prev" );
	desc4.putBoolean( id93, false );
	var id94 = charIDToTypeID( "rdep" );
	desc4.putInteger( id94, 3003 );
	var id95 = charIDToTypeID( "lomm" );
	desc4.putBoolean( id95, false );
	var id96 = charIDToTypeID( "sflp" );
	desc4.putBoolean( id96, false );
	var id97 = charIDToTypeID( "lflp" );
	desc4.putBoolean( id97, false );
	var id98 = charIDToTypeID( "scar" );
	desc4.putDouble( id98, 1.000000 );
	var id99 = charIDToTypeID( "scag" );
	desc4.putDouble( id99, 1.000000 );
	var id100 = charIDToTypeID( "scab" );
	desc4.putDouble( id100, 1.000000 );
	var id101 = charIDToTypeID( "scaa" );
	desc4.putDouble( id101, 1.000000 );
	var id102 = charIDToTypeID( "biar" );
	desc4.putDouble( id102, 0.000000 );
	var id103 = charIDToTypeID( "biag" );
	desc4.putDouble( id103, 0.000000 );
	var id104 = charIDToTypeID( "biab" );
	desc4.putDouble( id104, 0.000000 );
	var id105 = charIDToTypeID( "biaa" );
	desc4.putDouble( id105, 0.000000 );
	var id106 = charIDToTypeID( "siar" );
	desc4.putDouble( id106, 1.000000 );
	var id107 = charIDToTypeID( "siag" );
	desc4.putDouble( id107, 1.000000 );
	var id108 = charIDToTypeID( "siab" );
	desc4.putDouble( id108, 1.000000 );
	var id109 = charIDToTypeID( "siaa" );
	desc4.putDouble( id109, 1.000000 );
	var id110 = charIDToTypeID( "biir" );
	desc4.putDouble( id110, 0.000000 );
	var id111 = charIDToTypeID( "biig" );
	desc4.putDouble( id111, 0.000000 );
	var id112 = charIDToTypeID( "biib" );
	desc4.putDouble( id112, 0.000000 );
	var id113 = charIDToTypeID( "biia" );
	desc4.putDouble( id113, 0.000000 );
	var id114 = charIDToTypeID( "outw" );
	desc4.putBoolean( id114, false );
	var id115 = charIDToTypeID( "clcL" );
	desc4.putBoolean( id115, true );
    var id116 = stringIDToTypeID( "NVIDIA D3D/DDS" );
    desc1.putObject( id2, id116, desc4 );
}

// Toggles top uvs layer if is visible and mark it for toggling back
function toggleUvs() {
	var Layers = thepsd.layers;
	topLayer = Layers[0];
	if ( uvsVisible == true) {		// First layer is marked to be toggled back
		topLayer.visible = uvsVisible;
		uvsVisible = false;
	} else if ( (topLayer.name.toLowerCase() == "uv") || (topLayer.name.toLowerCase() == "uvs") ) {
		if (topLayer.visible == true) {
			topLayer.visible = uvsVisible;
			uvsVisible = true;
		}
	}
}

// Prepare multichannel for export (copy paste alpha channel, and hide RGB)
function toggleRGBA() {

	//var parentLayer = activeDocument.activeLayer.layerSets[0].name;
	var layer = activeDocument.activeLayer;
	var alphaLayer;
	
	// Detect alpha tag
	for (i=0; i<=7; i++) { 
	
		//if (layer.name.contains ("[A]"))
		if (stringContains(layer.name, "[A]") || stringContains(layer.name, "(A)")) {
			alphaLayer = layer;
			break;
		}
	
		var parentLayer = layer.parent;	
		if (parentLayer == activeDocument)
			break;
		else
			layer = parentLayer;

	}

	// If no alpha detected, abort rest of toggle
	if (typeof(alphaLayer) == 'undefined')
		return (true);
	
	// Find RGB sibling
	var parent = alphaLayer.parent;
	if (parent == activeDocument)
		return (true);						// for sanity, abort top layers
	var children = parent.layers;	
	for (i=0; i<children.length; i++) { 	
		if (stringContains(children[i].name, "[RGB]") || stringContains(children[i].name, "(RGB)")) {
		
			// If RGB layer is already visible by user, abort alpha copy/paste and the hide/show
			if (children[i].visible)
				return (true);
		
			rgbLayer = children[i];		
			rgbLayer.visible = false;
			break;
		}	
	}
	
	// Copy to alpha
	copyToAlpha ();	
	
	// If no RGB layer found, abort function with false, so essentially the [A] tag can be used to copy to alpha only
	if (typeof(rgbLayer) == 'undefined')
		return (false);
	
	// Show RGB layer (for export)
	//if (typeof(rgbLayer) != 'undefined')
	rgbLayer.visible = true;
	
	
	//alert ("good!");
	
	// Detect RGB sibling
	
	//thepsd.app.activeDocument.layerSets[0].layerSets[0];

}

// hide RGB layer if applicable
function hideRGB () {
	//alert (rgbLayer);
	if (typeof(rgbLayer) != 'undefined')
		rgbLayer.visible = false;
}

function copyToAlpha () {

	//return;

	// Detect alpha channel
	var alphaChannel
	try {
		//app.activeDocument.channels.getByName("Alpha 1");
		alphaChannel = app.activeDocument.channels.getByName("Alpha 1");
	} catch (err) {
		alphaChannel = app.activeDocument.channels.add();
		alphaChannel.name = "Alpha 1";		
		//alert ("error");
	}
	
	// Reselect rgba
	var idslct = charIDToTypeID( "slct" );
	var desc6 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref3 = new ActionReference();
	var idChnl = charIDToTypeID( "Chnl" );
	var idChnl = charIDToTypeID( "Chnl" );
	var idRGB = charIDToTypeID( "RGB " );
	ref3.putEnumerated( idChnl, idChnl, idRGB );
	desc6.putReference( idnull, ref3 );
	executeAction( idslct, desc6, DialogModes.NO );
	
	//var alphaChannel = app.activeDocument.channels.getByName("Alpha 1");
	
	if (typeof(alphaChannel) == 'undefined')		// not sure why still here
		return;
	
	// Copy merged to alpha channel <- incredibly slow
	//activeDocument.activeChannels = [app.activeDocument.channels[0], app.activeDocument.channels[1], app.activeDocument.channels[2]];
	//activeDocument.selection.selectAll();
	//activeDocument.selection.copy(true);
	//activeDocument.activeChannels = [alphaChannel];
	//activeDocument.paste ();
	//activeDocument.activeChannels = [app.activeDocument.channels[0], app.activeDocument.channels[1], app.activeDocument.channels[2]];
	//activeDocument.selection.deselect();
	
	// Copy merged via descriptors - 2x faster than above
	selectionCopyPaste (alphaChannel.name);
	activeDocument.selection.deselect();
	
	// Store selection test <- faster, but buggy for dark layers
	//activeDocument.selection.load (app.activeDocument.channels[0]);
	//activeDocument.selection.store (alphaChannel);			// This stores the selection, not the actual pixels
	//activeDocument.selection.deselect();

	// Store selection via descriptors - 2x faster than above, but still buggy
	//selectionLoad ();	
	//selectionStore (alphaChannel.name);
	//activeDocument.selection.deselect();
	
	// Copy/paste via action descriptors - this is 4x faster



	//activeDocument.selection.deselect();
	
	//activeDocument.selection.store (activeDocument.channels[3]);

//	selectChannel('RGB');  
//	alphaChannel.paste();

	// ReSelect RGB channels
	
}

function selectionCopyPaste (alphaName) {

	// =======================================================
	var idsetd = charIDToTypeID( "setd" );
		var desc3 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref1 = new ActionReference();
			var idChnl = charIDToTypeID( "Chnl" );
			var idfsel = charIDToTypeID( "fsel" );
			ref1.putProperty( idChnl, idfsel );
		desc3.putReference( idnull, ref1 );
		var idT = charIDToTypeID( "T   " );
		var idOrdn = charIDToTypeID( "Ordn" );
		var idAl = charIDToTypeID( "Al  " );
		desc3.putEnumerated( idT, idOrdn, idAl );
	executeAction( idsetd, desc3, DialogModes.NO );

	// =======================================================
	var idCpyM = charIDToTypeID( "CpyM" );
	executeAction( idCpyM, undefined, DialogModes.NO );

	// =======================================================
	var idslct = charIDToTypeID( "slct" );
		var desc4 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref2 = new ActionReference();
			var idChnl = charIDToTypeID( "Chnl" );
			//ref2.putName( idChnl, "Alpha 1" );
			ref2.putName( idChnl, alphaName );
		desc4.putReference( idnull, ref2 );
	executeAction( idslct, desc4, DialogModes.NO );

	// =======================================================
	var idpast = charIDToTypeID( "past" );
		var desc5 = new ActionDescriptor();
		var idAntA = charIDToTypeID( "AntA" );
		var idAnnt = charIDToTypeID( "Annt" );
		var idAnno = charIDToTypeID( "Anno" );
		desc5.putEnumerated( idAntA, idAnnt, idAnno );
	executeAction( idpast, desc5, DialogModes.NO );

	// =======================================================
	var idslct = charIDToTypeID( "slct" );
		var desc6 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref3 = new ActionReference();
			var idChnl = charIDToTypeID( "Chnl" );
			var idChnl = charIDToTypeID( "Chnl" );
			var idRGB = charIDToTypeID( "RGB " );
			ref3.putEnumerated( idChnl, idChnl, idRGB );
		desc6.putReference( idnull, ref3 );
	executeAction( idslct, desc6, DialogModes.NO );
	
}

function selectionLoad () {
	var idsetd = charIDToTypeID( "setd" );
    var desc3 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref1 = new ActionReference();
        var idChnl = charIDToTypeID( "Chnl" );
        var idfsel = charIDToTypeID( "fsel" );
        ref1.putProperty( idChnl, idfsel );
    desc3.putReference( idnull, ref1 );
    var idT = charIDToTypeID( "T   " );
        var ref2 = new ActionReference();
        var idChnl = charIDToTypeID( "Chnl" );
        var idChnl = charIDToTypeID( "Chnl" );
        var idRGB = charIDToTypeID( "RGB " );
        ref2.putEnumerated( idChnl, idChnl, idRGB );
    desc3.putReference( idT, ref2 );
	executeAction( idsetd, desc3, DialogModes.NO );
	
}

function selectionStore (alphaName) {
	var idsetd = charIDToTypeID( "setd" );
		var desc6 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref4 = new ActionReference();
			var idChnl = charIDToTypeID( "Chnl" );
			ref4.putName( idChnl, "Alpha 1" );
			//ref4.putName( idChnl, "Alpha 1" );
		desc6.putReference( idnull, ref4 );
		var idT = charIDToTypeID( "T   " );
			var ref5 = new ActionReference();
			var idChnl = charIDToTypeID( "Chnl" );
			var idfsel = charIDToTypeID( "fsel" );
			ref5.putProperty( idChnl, idfsel );
		desc6.putReference( idT, ref5 );
	executeAction( idsetd, desc6, DialogModes.NO );
}

// Return all dashes "\" as double dashes "\\" which is required to write preferences properly (otherwise will bugged when read later)
function safePath (textVar) {
	textVar = textVar.replace(new RegExp(/\\/g),"\\\\");
	return textVar;
}

// Check string contains another string, case insensitive
function stringContains (s, contains) {
	//return (s.indexOf(contains) != -1);
	return (s.toLowerCase().indexOf(contains.toLowerCase()) != -1);
}
//String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

// Check for relative paths, and return result
function processPath (targetPath) {

	// Get relative PSD path, and if there's no user specified path use it
	psdPath=activeDocument.path;
	if ( (typeof(fPath) == 'undefined') || (fPath == "Same as PSD...") || (fPath == "") ) {	
		return psdPath;
	}
	
	// User specified path overrides PSDs
	exportPath = targetPath;
	
	// Check for relative path
	if (targetPath.substr(1,2) != ":\\") {
		exportPath = psdPath + "/" + targetPath;		// Works regardless if user started it with "\" "/" or nothing. also supports ".." out of the box
	}

	//alert(exportPath);
	return exportPath;	
}

function getscriptpath() {	
	var dbLevel = $.level; 
	$.level = 0; 
	var path = undefined; 

	try { 
		some_undefined_variable; 
	}
	catch (e) { 
		path = e.fileName; 
	} 

	$.level = dbLevel; 
	return new Folder(path); 
	
};

function checkpsd() {
	// see if the image has previously been saved as a PSD (if there's no file extension then it hasn't been)
	//var thepsd=activeDocument;
	if ( (psdname.toLowerCase().indexOf(".psd") <= 0) && (psdname.toLowerCase().indexOf(".psb") <= 0) ) {
		alert("The current image must be saved as a PSD\\PSB file before continuing.","WARNING");
		return
	}
	
/*	
		//if it wasn't previously saved then we need to know where the user wants to put it
		psdsaved=false;
		//let the user know what's going on
		alert("The current image must be saved as a PSD file before continuing.","WARNING");
		//set "psdsave" to be the users "My Pictures" Folder, and add the name stored in "psdname".  
		var psdsave=File("~/My%20Documents/My%20Pictures/"+psdname);
		//open the save dialogue, using the predefined filename and path as the default
		psdpath=psdsave.saveDlg("Save as .psd...","Valid Types:*.psd;*.tga,All Files:*");
		//if the user clicked cancel then exit
		if(psdpath==null) {psdsaved=false; return;}
		// this will end in .psd no matter what, so we need to remove any extension info that may have been added
		//in the save dialogue first. 
		// Convert the file path to a workable string
		psdpath=psdpath.toString();
		//now find out how many characters there are before the full stop 
		psdsave=psdpath.indexOf(".");
		//then we copy the string back into itself, up to the full stop and bolt ".psd" on the end
		psdpath=psdpath.substring(0,psdsave)+".psd";
		//store the path string somewhere useful
		psdname=psdpath;
		//and convert psdpath back into a filepath object
		thepath=File(psdpath)
	}
	else {psdsaved=true};
	
	if (psdsaved==true) {
		//set "thepath" to be the document's path.
		thepath=thepsd.path;
		//save the psd and mark it as such before returning
		try
			{			
			thepsd.save();
			}
		catch(err)
			{
			alert ("The PSD could not be saved.\nPossibly it is checked in, or otherwise\nwrite protected, or another error occured.\nThe TGA may still be saved.","ERROR: Unable to Write");
			psdsaved=false;
			}
	}
	else {
		try {
			thepsd.saveAs(thepath, PhotoshopSaveOptions, false, Extension.NONE);
			psdname=activeDocument.name;
			psdsaved=true;
		}
		catch(err) {
			alert ("The PSD could not be saved.\nPossibly it is checked in, or otherwise\nwrite protected, or another error occured.\nThe TGA may still be saved.","ERROR: Unable to Write");
			psdsaved=false;
		}		
	}*/
}
