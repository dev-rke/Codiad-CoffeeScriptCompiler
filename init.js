/*
	Copyright (c) 2013, RKE
*/


(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  codiad.CoffeeScriptCompiler = (function() {
    /*
    		initialization
    */

    function CoffeeScriptCompiler(codiad, scripts, path, curpath) {
      this.codiad = codiad;
      this.scripts = scripts;
      this.path = path;
      this.curpath = curpath;
      this.getFileNameWithoutExtension = __bind(this.getFileNameWithoutExtension, this);
      this.getBaseDir = __bind(this.getBaseDir, this);
      this.getExtension = __bind(this.getExtension, this);
      this.compileCoffeeScript = __bind(this.compileCoffeeScript, this);
      this.saveFile = __bind(this.saveFile, this);
      this.addSaveHandler = __bind(this.addSaveHandler, this);
      this.addSaveHandler();
    }

    /*
    		Add new compiler procedure to save handler
    */


    CoffeeScriptCompiler.prototype.addSaveHandler = function() {
      var _this = this;
      return amplify.subscribe('active.onSave', function() {
        var compiledContent, content, editorPath, editorSession, exception, ext, fileName;
        editorPath = _this.codiad.active.getPath();
        ext = _this.getExtension(editorPath);
        if (ext === 'coffee') {
          content = _this.codiad.editor.getContent();
          try {
            compiledContent = _this.compileCoffeeScript(content);
          } catch (_error) {
            exception = _error;
            _this.codiad.message.error('CoffeeScript compilation failed: ' + exception);
            if (exception.location) {
              editorSession = _this.codiad.active.sessions[codiad.active.getPath()];
              editorSession.setAnnotations([
                {
                  row: exception.location.first_line,
                  column: exception.location.first_column,
                  text: exception.toString(),
                  type: "error"
                }
              ]);
            }
          }
          fileName = _this.getFileNameWithoutExtension(editorPath) + "js";
          return _this.saveFile(fileName, compiledContent);
        }
      });
    };

    /*	
    		saves a file, creates one if it does not exist
    */


    CoffeeScriptCompiler.prototype.saveFile = function(fileName, fileContent) {
      var baseDir,
        _this = this;
      baseDir = this.getBaseDir(fileName);
      if (!this.codiad.filemanager.getType(fileName)) {
        $.ajax({
          url: this.codiad.filemanager.controller + '?action=create&path=' + fileName + '&type=file',
          success: function(data) {
            var createResponse;
            createResponse = _this.codiad.jsend.parse(data);
            if (createResponse === !'error') {
              _this.codiad.filemanager.createObject(path, baseDir, 'file');
              return amplify.publish('filemanager.onCreate', {
                createPath: baseDir,
                path: path,
                shortName: fileName,
                type: 'file'
              });
            }
          },
          async: false
        });
      }
      return this.codiad.filemanager.saveFile(fileName, fileContent, {
        success: function() {
          return _this.codiad.filemanager.rescan(baseDir);
        },
        error: function() {
          return _this.codiad.message.error('Cannot save compiled CoffeeScript file.');
        }
      });
    };

    /*
    		compile CoffeeScript
    */


    CoffeeScriptCompiler.prototype.compileCoffeeScript = function(content) {
      var exception;
      if (typeof window.CoffeeScript === 'undefined') {
        $.ajax({
          url: this.curpath + "coffee-script.js",
          dataType: "script",
          async: false
        });
      }
      try {
        return CoffeeScript.compile(content);
      } catch (_error) {
        exception = _error;
        throw exception;
      }
    };

    /*
    		Get extension of file
    */


    CoffeeScriptCompiler.prototype.getExtension = function(filepath) {
      return filepath.substring(filepath.lastIndexOf(".") + 1);
    };

    /*
    		Get base dir of a path
    */


    CoffeeScriptCompiler.prototype.getBaseDir = function(filepath) {
      return filepath.substring(0, filepath.lastIndexOf("/"));
    };

    /*
    		Get filename without file extension of a file
    */


    CoffeeScriptCompiler.prototype.getFileNameWithoutExtension = function(filepath) {
      return filepath.substr(0, filepath.indexOf(".") + 1);
    };

    return CoffeeScriptCompiler;

  })();

  (function(global, $) {
    var codiad, curpath, path, scripts;
    codiad = global.codiad;
    scripts = document.getElementsByTagName('script');
    path = scripts[scripts.length - 1].src.split('?')[0];
    curpath = path.split('/').slice(0, -1).join('/') + '/';
    return $(function() {
      return new codiad.CoffeeScriptCompiler(codiad, scripts, path, curpath);
    });
  })(this, jQuery);

}).call(this);
