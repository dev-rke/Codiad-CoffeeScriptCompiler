//# sourceMappingURL=init.map
// Generated by CoffeeScript 1.6.3
/*
	Copyright (c) 2013 - 2014, RKE
*/


(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  codiad.CoffeeScriptCompiler = (function() {
    var settings;

    CoffeeScriptCompiler.instance = null;

    settings = null;

    /*
    		basic plugin environment initialization
    */


    function CoffeeScriptCompiler(global, jQuery) {
      this.showDialog = __bind(this.showDialog, this);
      this.getFileNameWithoutExtension = __bind(this.getFileNameWithoutExtension, this);
      this.getBaseDir = __bind(this.getBaseDir, this);
      this.compileCoffeeScript = __bind(this.compileCoffeeScript, this);
      this.saveFile = __bind(this.saveFile, this);
      this.compileCoffeeScriptAndSave = __bind(this.compileCoffeeScriptAndSave, this);
      this.coffeeLint = __bind(this.coffeeLint, this);
      this.addOpenHandler = __bind(this.addOpenHandler, this);
      this.addSaveHandler = __bind(this.addSaveHandler, this);
      this.preloadLibrariesAndSettings = __bind(this.preloadLibrariesAndSettings, this);
      this.init = __bind(this.init, this);
      var _this = this;
      this.codiad = global.codiad;
      this.amplify = global.amplify;
      this.jQuery = jQuery;
      this.scripts = document.getElementsByTagName('script');
      this.path = this.scripts[this.scripts.length - 1].src.split('?')[0];
      this.curpath = this.path.split('/').slice(0, -1).join('/') + '/';
      CoffeeScriptCompiler.instance = this;
      this.jQuery(function() {
        return _this.init();
      });
    }

    /*
    		main plugin initialization
    */


    CoffeeScriptCompiler.prototype.init = function() {
      this.preloadLibrariesAndSettings();
      this.addSaveHandler();
      this.lintEvent = null;
      return this.addOpenHandler();
    };

    /*
    		load coffeescript and coffeelint libraries
    */


    CoffeeScriptCompiler.prototype.preloadLibrariesAndSettings = function() {
      var _this = this;
      if (typeof window.CoffeeScript === 'undefined') {
        this.jQuery.ajax({
          url: this.curpath + "coffee-script.js",
          dataType: "script",
          async: false
        });
      }
      if (typeof window.coffeelint === 'undefined') {
        this.jQuery.ajax({
          url: this.curpath + "coffeelint.js",
          dataType: "script",
          async: false
        });
      }
      return this.jQuery.getJSON(this.curpath + "controller.php?action=load", function(json) {
        return _this.settings = json;
      });
    };

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
      var content, currentFile, editor, error, errorList, errors, exception, ext, lintsettings, setting, status, value, _ref;
      currentFile = this.codiad.active.getPath();
      ext = this.codiad.filemanager.getExtension(currentFile);
      if (ext.toLowerCase() === 'coffee') {
        content = this.codiad.editor.getContent();
        try {
          lintsettings = {};
          _ref = this.settings.coffeelint;
          for (setting in _ref) {
            value = _ref[setting];
            status = value ? 'error' : 'ignore';
            lintsettings[setting] = {
              "level": status
            };
          }
          if (!this.codiad.editor.settings.softTabs) {
            lintsettings.indentation.value = 1;
          }
          errors = coffeelint.lint(content, lintsettings);
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


    CoffeeScriptCompiler.prototype.compileCoffeeScriptAndSave = function() {
      var compiledContent, compiledJS, content, currentFile, editorSession, exception, ext, fileName, options, sourceMapFileName;
      if (!this.settings.compile_coffeescript) {
        return;
      }
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
        if (this.settings.enable_header) {
          options.header = true;
        }
        if (this.settings.enable_bare) {
          options.bare = true;
        }
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
        if (this.settings.generate_sourcemap) {
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
        this.jQuery.ajax({
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
        this.jQuery.ajax({
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

    /*
           shows settings dialog
    */


    CoffeeScriptCompiler.prototype.showDialog = function() {
      var coffeeLintRules, html, level, name, rule, title, value,
        _this = this;
      coffeeLintRules = (function() {
        var _ref, _results;
        _ref = this.settings.coffeelint;
        _results = [];
        for (name in _ref) {
          value = _ref[name];
          level = value ? 'checked="checked"' : '';
          rule = coffeelint.RULES[name].message;
          title = coffeelint.RULES[name].description.replace(/<[^>]+>/gi, "");
          _results.push("			    <input type=\"checkbox\" id=\"" + name + "\" " + level + " />\n<label for=\"" + name + "\"  title=\"" + title + "\">" + rule + "</label><br />");
        }
        return _results;
      }).call(this);
      html = "<div id=\"coffeescript-settings\">\n	            <h2>CoffeeScript Compiler Settings</h2>\n	            <input type=\"checkbox\" id=\"compile_coffeescript\"\n	            	" + (this.settings.compile_coffeescript ? 'checked="checked"' : '') + "\n	            	/>\n	            <label for=\"compile_coffeescript\">\n	            	Compile CoffeeScript on save\n	            </label><br />\n	            <input type=\"checkbox\" id=\"generate_sourcemap\"\n	            	" + (this.settings.generate_sourcemap ? 'checked="checked"' : '') + "\n	            	/>\n	            <label for=\"generate_sourcemap\">\n	            	Generate SourceMap on save\n	            </label><br />\n	            <input type=\"checkbox\" id=\"enable_header\"\n	            	" + (this.settings.enable_header ? 'checked="checked"' : '') + "\n	            	/>\n	            <label for=\"enable_header\">\n	            	Enable CoffeeScript header in compiled file\n	            </label><br />\n	            <input type=\"checkbox\" id=\"enable_bare\"\n	            	" + (this.settings.enable_bare ? 'checked="checked"' : '') + "\n	            	/>\n	            <label for=\"enable_bare\">\n	            	Compile without a top-level function wrapper\n	            </label><br />\n	            <h2 id=\"coffeelint-headline\">CoffeeLint Settings</h2>\n	            <div id=\"coffeelint-container\">\n	        		" + (coffeeLintRules.join('')) + "\n	        	</div>\n	        	<button id=\"modal_close\">Save Settings</button>\n        	</div>";
      this.jQuery('#modal-content').append(this.jQuery(html));
      this.jQuery('#modal').show().draggable({
        handle: '#drag-handle'
      });
      settings = this.settings;
      this.jQuery('#modal-content').on('click', 'input', function(target) {
        var isActive;
        name = $(target.currentTarget).attr('id');
        isActive = $(target.currentTarget).prop('checked');
        if (name in settings) {
          settings[name] = isActive;
        }
        if (name in settings.coffeelint) {
          settings.coffeelint[name] = isActive;
        }
        return true;
      });
      return this.jQuery('#modal_close').on('click', function() {
        _this.codiad.modal.unload();
        _this.jQuery('#modal-content').off();
        _this.settings = settings;
        _this.jQuery.post(_this.curpath + "controller.php?action=save", {
          settings: JSON.stringify(settings)
        }, function(data) {
          var json;
          json = JSON.parse(data);
          if (json.status === "error") {
            return _this.codiad.message.error(json.message);
          } else {
            return _this.codiad.message.success(json.message);
          }
        });
        return _this.coffeeLint();
      });
    };

    /*
           Static wrapper to call showDialog outside of the object
    */


    CoffeeScriptCompiler.showDialogWrapper = function() {
      return CoffeeScriptCompiler.instance.showDialog();
    };

    return CoffeeScriptCompiler;

  }).call(this);

  new codiad.CoffeeScriptCompiler(this, jQuery);

}).call(this);
