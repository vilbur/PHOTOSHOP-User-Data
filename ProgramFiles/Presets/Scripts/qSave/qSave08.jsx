// AUTHOR: Ariel Chai
// CREDIT: James A. Taylor for core implementation of vTools.
// DESCRIPTION: module for qSave script, made for easier shortcut assignment within photoshop.

var appendType;

#target photoshop
app.bringToFront();

//Get the whole thing moving
main();

function main()	{
	// set file append type
	appendType = 8; 	// specular

	// for now this just load the qSave.jsx file, which is great for testing scripts without restarting photoshop
	var scriptpath=getscriptpath();
	scriptpath=scriptpath.path;
	var scriptfile=File(scriptpath+"/qSave.jsx");
	if (scriptfile.exists)
		{
		scriptfile.open("r");
		var runme=scriptfile.read();
		runme=runme.toString();
		eval(runme);
		scriptfile.close();
		}
	else {
		alert("This script requires a companion file to function.\n\nEnsure the following scripts are located in the same folder and try again:\n\n  qSave.jsx\n  qSaveDiffuse.jsx","ERROR: Missing File");
	}
}

function getscriptpath() {	
	var dbLevel = $.level; 
	$.level = 0; 
	var path = undefined; 

	try 
		{ 
		some_undefined_variable; 
		}
	catch (e) 
	{ 
    path = e.fileName; 
	} 

	$.level = dbLevel; 
	return new Folder(path); 
};
