/*
	Copyright (c) 2013 - 2014, RKE
*/


(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  codiad.CoffeeScriptCompiler = (function() {
    /*
    		initialization
    */

    function CoffeeScriptCompiler(global, jQuery) {
      this.getFileNameWithoutExtension = __bind(this.getFileNameWithoutExtension, this);
      this.getBaseDir = __bind(this.getBaseDir, this);
      this.compileCoffeeScript = __bind(this.compileCoffeeScript, this);
      this.saveFile = __bind(this.saveFile, this);
      this.compileCoffeeScriptAndSave = __bind(this.compileCoffeeScriptAndSave, this);
      this.coffeeLint = __bind(this.coffeeLint, this);
      this.addOpenHandler = __bind(this.addOpenHandler, this);
      this.addSaveHandler = __bind(this.addSaveHandler, this);
      this.codiad = global.codiad;
      this.amplify = global.amplify;
      this.$ = jQuery;
      this.scripts = document.getElementsByTagName('script');
      this.path = this.scripts[this.scripts.length - 1].src.split('?')[0];
      this.curpath = this.path.split('/').slice(0, -1).join('/') + '/';
      this.addSaveHandler();
      this.lintEvent = null;
      this.addOpenHandler();
    }

    /*
    		Add new compiler procedure to save handler
    */


    CoffeeScriptCompiler.prototype.addSaveHandler = function() {
      var _this = this;
      return this.amplify.subscribe('active.onSave', function() {
        return _this.compileCoffeeScriptAndSave();
      });
    };

    /*
    		Add hotkey binding for manual compiling
    */


    CoffeeScriptCompiler.prototype.addOpenHandler = function() {
      var _this = this;
      return this.amplify.subscribe('active.onOpen', function() {
        var manager;
        manager = _this.codiad.editor.getActive().commands;
        manager.addCommand({
          name: "Compile CoffeeScript",
          bindKey: {
            win: "Ctrl-Alt-C",
            mac: "Command-Alt-C"
          },
          exec: function() {
            return _this.compileCoffeeScriptAndSave();
          }
        });
        _this.lintEvent = setTimeout(_this.coffeeLint, 3000);
        return _this.codiad.editor.getActive().getSession().on('change', function(e) {
          clearTimeout(_this.lintEvent);
          return _this.lintEvent = setTimeout(_this.coffeeLint, 3000);
        });
      });
    };

    /*
    		lints coffeescript
    */


    CoffeeScriptCompiler.prototype.coffeeLint = function() {
      var content, currentFile, editor, error, errorList, errors, exception, ext;
      currentFile = this.codiad.active.getPath();
      ext = this.codiad.filemanager.getExtension(currentFile);
      if (ext.toLowerCase() === 'coffee') {
        content = this.codiad.editor.getContent();
        if (typeof window.CoffeeScript === 'undefined') {
          this.$.ajax({
            url: this.curpath + "coffee-script.js",
            dataType: "script",
            async: false
          });
        }
        if (typeof window.coffeelint === 'undefined') {
          this.$.ajax({
            url: this.curpath + "coffeelint.js",
            dataType: "script",
            async: false
          });
        }
        try {
          errors = coffeelint.lint(content, {
            "no_tabs": {
              "level": "ignore"
            },
            "indentation": {
              "level": "ignore"
            }
          });
        } catch (_error) {
          exception = _error;
          this.codiad.message.error('CoffeeScript linting failed: ' + exception);
        }
        if (errors) {
          editor = this.codiad.editor.getActive().getSession();
          errorList = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = errors.length; _i < _len; _i++) {
              error = errors[_i];
              _results.push({
                row: error.lineNumber - 1,
                column: 1,
                text: error.message,
                type: "warning"
              });
            }
            return _results;
          })();
          return editor.setAnnotations(errorList.concat(editor.getAnnotations()));
        }
      }
    };

    /*
    		compiles CoffeeScript and saves it to the same name
    		with a different file extension
    */


    CoffeeScriptCompiler.prototype.compileCoffeeScriptAndSave = function(generateSourceMap) {
      var compiledContent, compiledJS, content, currentFile, editorSession, exception, ext, fileName, options, sourceMapFileName;
      currentFile = this.codiad.active.getPath();
      ext = this.codiad.filemanager.getExtension(currentFile);
      if (ext.toLowerCase() === 'coffee') {
        content = this.codiad.editor.getContent();
        fileName = this.getFileNameWithoutExtension(currentFile);
        options = {
          sourceMap: true,
          sourceFiles: [this.codiad.filemanager.getShortName(currentFile)],
          generatedFile: this.codiad.filemanager.getShortName(fileName + 'js')
        };
        try {
          compiledContent = this.compileCoffeeScript(content, options);
        } catch (_error) {
          exception = _error;
          this.codiad.message.error('CoffeeScript compilation failed: ' + exception);
          if (exception.location) {
            editorSession = this.codiad.active.sessions[currentFile];
            editorSession.setAnnotations([
              {
                row: exception.location.first_line,
                column: exception.location.first_column,
                text: exception.toString(),
                type: "error"
              }
            ]);
          }
          return;
        }
        this.codiad.message.success('CoffeeScript compiled successfully.');
        compiledJS = compiledContent != null ? compiledContent.js : void 0;
        if (generateSourceMap) {
          sourceMapFileName = this.codiad.filemanager.getShortName(fileName + "map");
          compiledJS = ("//# sourceMappingURL=" + sourceMapFileName + "\n") + compiledJS;
          this.saveFile(fileName + "map", compiledContent != null ? compiledContent.v3SourceMap : void 0);
        }
        return this.saveFile(fileName + "js", compiledJS);
      }
    };

    /*
    		saves a file, creates one if it does not exist
    */


    CoffeeScriptCompiler.prototype.saveFile = function(fileName, fileContent) {
      var baseDir,
        _this = this;
      baseDir = this.getBaseDir(fileName);
      if (!this.codiad.filemanager.getType(fileName)) {
        this.$.ajax({
          url: this.codiad.filemanager.controller + '?action=create&path=' + fileName + '&type=file',
          success: function(data) {
            var createResponse;
            createResponse = _this.codiad.jsend.parse(data);
            if (createResponse === !'error') {
              _this.codiad.filemanager.createObject(path, baseDir, 'file');
              return _this.amplify.publish('filemanager.onCreate', {
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
          return _this.codiad.message.error('Cannot save file.');
        }
      });
    };

    /*
    		compile CoffeeScript
    */


    CoffeeScriptCompiler.prototype.compileCoffeeScript = function(content, options) {
      var exception;
      if (typeof window.CoffeeScript === 'undefined') {
        this.$.ajax({
          url: this.curpath + "coffee-script.js",
          dataType: "script",
          async: false
        });
      }
      try {
        return CoffeeScript.compile(content, options);
      } catch (_error) {
        exception = _error;
        throw exception;
      }
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

  new codiad.CoffeeScriptCompiler(this, jQuery);

}).call(this);
