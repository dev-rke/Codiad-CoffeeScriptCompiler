###
	Copyright (c) 2013, RKE
###

class codiad.CoffeeScriptCompiler
	
	###
		initialization
	###
	constructor: (global, jQuery) ->
		@codiad = global.codiad
		@$ = jQuery
		@scripts = document.getElementsByTagName('script')
		@path = @scripts[@scripts.length - 1].src.split('?')[0]
		@curpath = @path.split('/').slice(0, -1).join('/') + '/'
		
		@addSaveHandler()
		@addOpenHandler()
		
	
	###
		Add new compiler procedure to save handler
	###
	addSaveHandler: =>
		amplify.subscribe('active.onSave', =>
			@compileCoffeeScriptAndSave()
		)
		
		
	###
		Add hotkey binding for manual compiling
	###
	addOpenHandler: =>
		amplify.subscribe('active.onOpen', =>
			manager = @codiad.editor.getActive().commands
			manager.addCommand(
				name: "Compile CoffeeScript"
				bindKey: 
					win: "Ctrl-Alt-C"
					mac: "Command-Alt-C"
				exec: =>
					@compileCoffeeScriptAndSave()
			)
		)
		
		
	###
		compiles CoffeeScript and saves it to the same name with a different file extension
	###
	compileCoffeeScriptAndSave: ->
		editorPath = @codiad.active.getPath()
		ext = @getExtension editorPath
		if ext is 'coffee'
			content = @codiad.editor.getContent()
			try
				compiledContent = @compileCoffeeScript content
			catch exception
				# show error message and editor annotation
				@codiad.message.error 'CoffeeScript compilation failed: ' + exception
				if exception.location
					editorSession = @codiad.active.sessions[codiad.active.getPath()]
					editorSession.setAnnotations([
						row:    exception.location.first_line
						column: exception.location.first_column
						text:   exception.toString()
						type:   "error"
					])
			#console.log(compiledContent);
			codiad.message.success 'CoffeeScript compiled successfully.'
			fileName = @getFileNameWithoutExtension(editorPath) + "js"
			@saveFile fileName, compiledContent
	
	
	###	
		saves a file, creates one if it does not exist
	###
	saveFile: (fileName, fileContent) =>
		
		baseDir = @getBaseDir fileName
		
		# create new node for file save if file does not exist, do it not async
		if not @codiad.filemanager.getType fileName
			$.ajax(
				url: @codiad.filemanager.controller + '?action=create&path=' + fileName + '&type=file'
				success: (data) =>
					createResponse = @codiad.jsend.parse data
					if createResponse is not 'error'
						@codiad.filemanager.createObject path, baseDir, 'file'
						# Notify listeners.
						amplify.publish('filemanager.onCreate'
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
				@codiad.message.error 'Cannot save compiled CoffeeScript file.'
		)
	
	
	###
		compile CoffeeScript
	###
	compileCoffeeScript: (content) =>
		# CoffeeScript Preload helper
		if typeof(window.CoffeeScript) is 'undefined'
			$.ajax(
				url: @curpath + "coffee-script.js"
				dataType: "script"
				async: false
			)
		try
			CoffeeScript.compile content
		catch exception
			throw exception
	
	
	###
		Get extension of file
	###
	getExtension: (filepath) =>
		filepath.substring filepath.lastIndexOf(".") + 1
	
	
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


new codiad.CoffeeScriptCompiler(this, jQuery)