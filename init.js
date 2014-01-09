/*
 * Copyright (c) RKE
 */

(function(global, $) {

	var codiad = global.codiad,
		scripts = document.getElementsByTagName('script'),
		path = scripts[scripts.length - 1].src.split('?')[0],
		curpath = path.split('/').slice(0, -1).join('/') + '/';


	$(function() {
		codiad.CoffeeScriptCompiler.init();
	});


	codiad.CoffeeScriptCompiler = {

		path: curpath,
		_this: null,

		init: function() {
			_this = this;
			_this.addSaveHandler();
		},

		//////////////////////////////////////////////////////////
		//
		//  Add compilation to save handler
		//
		//////////////////////////////////////////////////////////
		addSaveHandler: function() {
			amplify.subscribe('active.onSave', function() {
				var editorPath = codiad.active.getPath();
				var ext = _this.getExtension(editorPath);
				if (ext === 'coffee') {
					var content = codiad.editor.getContent();
					try {
						var compiledContent = _this.compileCoffeeScript(content);
					} catch(exception) {
						// show error message and editor annotation
						codiad.message.error('CoffeeScript compilation failed: ' + exception);
						if(exception.location) {
							var editorSession = codiad.active.sessions[codiad.active.getPath()];
							editorSession.setAnnotations([{
								row: exception.location.first_line,
								column: exception.location.first_column,
								text: exception.toString(),
								type: "error"
							}]);
						}
					}
					//console.log(compiledContent);
					var fileName = _this.getFileNameWithoutExtension(editorPath) + "js";
					
					_this.saveFile(fileName, compiledContent)
				}
			});
		},
		
		
		//////////////////////////////////////////////////////////
		//
		//  saves a file, creates one if it does not exist
		//
		//////////////////////////////////////////////////////////
		saveFile: function(fileName, fileContent) {
			
			var baseDir = _this.getBaseDir(fileName);
			
			// create new node for file save, do it not async
			if(!codiad.filemanager.getType(fileName)) {
				$.ajax({
					url: codiad.filemanager.controller + '?action=create&path=' + fileName + '&type=file', 
					success: function(data) {
						var createResponse = codiad.jsend.parse(data);
						if (createResponse != 'error') {
							codiad.filemanager.createObject(path, baseDir, 'file');
							/* Notify listeners. */
							amplify.publish('filemanager.onCreate', {createPath: baseDir, path: path, shortName: fileName, type: 'file'});
						}
					},
					async: false
				});
			}
			
			// save compiled javascript to new filename in the same directory
            codiad.filemanager.saveFile(fileName, fileContent, {
				success: function() {
					// rescan current folder
					codiad.filemanager.rescan(baseDir);
				},
				error: function() {
					codiad.message.error('Cannot save compiled CoffeeScript file.');
				}
			});
			
		},
		
		//////////////////////////////////////////////////////////
		//
		//  compile CoffeeScript
		//
		//////////////////////////////////////////////////////////
		compileCoffeeScript: function(content) {
			// CoffeeScript Load helper
			if (typeof(window.CoffeeScript) === 'undefined') {
				$.ajax({
					url: this.path + "coffee-script.js",
					dataType: "script",
					async: false
				});
			}
			var compiledCoffeeScript = "";
			try {
				compiledCoffeeScript = CoffeeScript.compile(content);
			} catch(exception) {
				throw exception;
			}
			return compiledCoffeeScript;
		},

		//////////////////////////////////////////////////////////
		//
		//  Get extension of file
		//
		//////////////////////////////////////////////////////////
		getExtension: function(filepath) {
			return filepath.substring(filepath.lastIndexOf(".") + 1);
		},
		
		//////////////////////////////////////////////////////////
		//
		//  Get base dir of a path
		//
		//////////////////////////////////////////////////////////
		getBaseDir: function(filepath) {
			return filepath.substring(0, filepath.lastIndexOf("/"));
		},
		
		//////////////////////////////////////////////////////////
		//
		//  Get filename without file extension of a file
		//
		//////////////////////////////////////////////////////////
		getFileNameWithoutExtension: function(filepath) {
			return filepath.substr(0, filepath.indexOf(".") + 1)
		}
	};
})(this, jQuery);