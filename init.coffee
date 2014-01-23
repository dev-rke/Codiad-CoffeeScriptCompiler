###
	Copyright (c) 2013 - 2014, RKE
###

class codiad.CoffeeScriptCompiler
	
	@instance = null
	settings = null
	
	###
		basic plugin environment initialization
	###
	constructor: (global, jQuery) ->
		@codiad = global.codiad
		@amplify = global.amplify
		@jQuery = jQuery
		
		@scripts = document.getElementsByTagName('script')
		@path = @scripts[@scripts.length - 1].src.split('?')[0]
		@curpath = @path.split('/').slice(0, -1).join('/') + '/'
		
		CoffeeScriptCompiler.instance = @
		
		# wait until dom is loaded
		@jQuery =>
			@init()
			
	
	###
		main plugin initialization
	###
	init: =>
		@preloadLibrariesAndSettings()
		@addSaveHandler()
		@lintEvent = null
		@addOpenHandler()
	
	
	###
		load coffeescript and coffeelint libraries
	###
	preloadLibrariesAndSettings: =>
		# CoffeeScript Preload Helper
		if typeof(window.CoffeeScript) is 'undefined'
			@jQuery.ajax(
				url: @curpath + "coffee-script.js"
				dataType: "script"
				async: false
			)
		# CoffeeLint Preload helper
		if typeof(window.coffeelint) is 'undefined'
			@jQuery.ajax(
				url: @curpath + "coffeelint.js"
				dataType: "script"
				async: false
			)
		# load settings
		@jQuery.getJSON @curpath+"controller.php?action=load", (json) =>
			@settings = json
	
	###
		Add new compiler procedure to save handler
	###
	addSaveHandler: =>
		@amplify.subscribe('active.onSave', =>
			@compileCoffeeScriptAndSave()
		)
		
		
	###
		Add hotkey binding for manual compiling
	###
	addOpenHandler: =>
		@amplify.subscribe('active.onOpen', =>
			manager = @codiad.editor.getActive().commands
			manager.addCommand(
				name: "Compile CoffeeScript"
				bindKey:
					win: "Ctrl-Alt-C"
					mac: "Command-Alt-C"
				exec: =>
					@compileCoffeeScriptAndSave()
			)
			
			@lintEvent = setTimeout @coffeeLint, 3000
			@codiad.editor.getActive().getSession().on 'change', (e) =>
				clearTimeout @lintEvent
				@lintEvent = setTimeout @coffeeLint, 3000
		)
	
	
	###
		lints coffeescript
	###
	coffeeLint: =>
		currentFile = @codiad.active.getPath()
		ext = @codiad.filemanager.getExtension(currentFile)
		if ext.toLowerCase() is 'coffee'
			content = @codiad.editor.getContent()
			try
				lintsettings = {}
				for setting,value of @settings.coffeelint
					status = if value then 'error' else 'ignore'
					lintsettings[setting] = "level": status
					
				# set indentation size to editor tab size
				lintsettings.indentation.value = 1 if not @codiad.editor.settings.softTabs
				
				# lint coffeescript using settings
				errors = coffeelint.lint content, lintsettings
			catch exception
				@codiad.message.error 'CoffeeScript linting failed: ' + exception
			if errors
				editor = @codiad.editor.getActive().getSession()
				
				errorList = for error in errors
					row:    error.lineNumber - 1
					column: 1
					text:   error.message
					type:   "warning"
				editor.setAnnotations(errorList.concat editor.getAnnotations())
	
		
	###
		compiles CoffeeScript and saves it to the same name
		with a different file extension
	###
	compileCoffeeScriptAndSave: =>
		return unless @settings.coffeescript.compile_coffeescript
		
		currentFile = @codiad.active.getPath()
		ext = @codiad.filemanager.getExtension(currentFile)
		if ext.toLowerCase() is 'coffee'
		
			content = @codiad.editor.getContent()
			
			fileName = @getFileNameWithoutExtension(currentFile)
			
			options =
				sourceMap: true
				sourceFiles: [@codiad.filemanager.getShortName currentFile]
				generatedFile: @codiad.filemanager.getShortName fileName + 'js'
			
			if @settings.coffeescript.enable_header
				options.header = true
			
			if @settings.coffeescript.enable_bare
				options.bare = true
			
			try
				compiledContent = @compileCoffeeScript content, options
			catch exception
				# show error message and editor annotation
				@codiad.message.error 'CoffeeScript compilation failed: ' + exception
				if exception.location
					editorSession = @codiad.active.sessions[currentFile]
					editorSession.setAnnotations([
						row:    exception.location.first_line
						column: exception.location.first_column
						text:   exception.toString()
						type:   "error"
					])
				return
			#console.log(compiledContent);
			@codiad.message.success 'CoffeeScript compiled successfully.'
			
			compiledJS = compiledContent?.js
			if @settings.coffeescript.generate_sourcemap
				sourceMapFileName = @codiad.filemanager.getShortName fileName + "map"
				compiledJS = "//# sourceMappingURL=#{sourceMapFileName}\n" + compiledJS
				@saveFile fileName + "map", compiledContent?.v3SourceMap
			@saveFile fileName + "js",  compiledJS
		
	
	###
		saves a file, creates one if it does not exist
	###
	saveFile: (fileName, fileContent) =>
		
		baseDir = @getBaseDir fileName
		
		# create new node for file save if file does not exist, do it not async
		if not @codiad.filemanager.getType fileName
			@jQuery.ajax(
				url: @codiad.filemanager.controller + '?action=create&path=' +
					 fileName + '&type=file'
				success: (data) =>
					createResponse = @codiad.jsend.parse data
					if createResponse is not 'error'
						@codiad.filemanager.createObject path, baseDir, 'file'
						# Notify listeners.
						@amplify.publish('filemanager.onCreate'
							createPath: baseDir
							path:       path
							shortName:  fileName
							type:       'file'
						)
				async: false
			)
			
		# save compiled javascript to new filename in the same directory
		@codiad.filemanager.saveFile(fileName, fileContent,
			success: =>
				# rescan current folder
				@codiad.filemanager.rescan baseDir
			error: =>
				@codiad.message.error 'Cannot save file.'
		)
	
	
	###
		compile CoffeeScript
	###
	compileCoffeeScript: (content, options) =>
		# CoffeeScript Preload helper
		if typeof(window.CoffeeScript) is 'undefined'
			@jQuery.ajax(
				url: @curpath + "coffee-script.js"
				dataType: "script"
				async: false
			)
		try
			CoffeeScript.compile content, options
		catch exception
			throw exception
	
	
	###
		Get base dir of a path
	###
	getBaseDir: (filepath) =>
		filepath.substring 0, filepath.lastIndexOf("/")
	
	
	###
		Get filename without file extension of a file
	###
	getFileNameWithoutExtension: (filepath) =>
		filepath.substr 0, filepath.indexOf(".") + 1
	
	
	###
        shows settings dialog
    ###
	showDialog: =>
		
		generateCheckbox = (name, label, enabled = false, title = "") =>
			"""
			    <input type="checkbox" id="#{name}" #{'checked="checked"' if enabled} />
				<label for="#{name}"  title="#{title}">#{label}</label><br />
			"""
		
		coffeeScriptLabels =
			'compile_coffeescript': 'Compile CoffeeScript on save'
			'generate_sourcemap': 'Generate SourceMap on save'
			'enable_header': 'Enable CoffeeScript header in compiled file'
			'enable_bare': 'Compile without a top-level function wrapper'
		
		coffeeScriptRules = for name,value of @settings.coffeescript
			label = coffeeScriptLabels[name]
			generateCheckbox name, label, value
		
		coffeeLintRules = for name,value of @settings.coffeelint
			label = coffeelint.RULES[name].message
			title = coffeelint.RULES[name].description.replace /<[^>]+>/gi, ""
			generateCheckbox name, label, value, title
        
		html = """
			<div id="coffeescript-settings">
	            <h2>CoffeeScript Compiler Settings</h2>
	            <div id="coffeescript-container">
	        		#{coffeeScriptRules.join('')}
	        	</div>
	            <h2 id="coffeelint-headline">CoffeeLint Settings</h2>
	            <div id="coffeelint-container">
	        		#{coffeeLintRules.join('')}
	        	</div>
	        	<button id="modal_close">Save Settings</button>
        	</div>
		"""
        
		@jQuery('#modal-content').append @jQuery html
		
		@jQuery('#modal').show().draggable handle: '#drag-handle'
		
		settings = @settings
		
		@jQuery('#modal-content').on('click', 'input', (target) =>
			name = $(target.currentTarget).attr 'id'
			isActive = $(target.currentTarget).prop 'checked'
			if name of settings.coffeescript
				settings.coffeescript[name] = isActive
			if name of settings.coffeelint
				settings.coffeelint[name] = isActive
			return true
		)
		@jQuery('#modal_close').on('click', =>
			@codiad.modal.unload()
			@jQuery('#modal-content').off()
			@settings = settings
			@jQuery.post @curpath+"controller.php?action=save", settings: JSON.stringify(settings), (data) =>
				json = JSON.parse data
				if json.status is "error"
					@codiad.message.error json.message
				else
					@codiad.message.success json.message
			@coffeeLint()
		)
		
		
		
	###
        Static wrapper to call showDialog outside of the object
    ###
	@showDialogWrapper: =>
		@instance.showDialog()


new codiad.CoffeeScriptCompiler(this, jQuery)
