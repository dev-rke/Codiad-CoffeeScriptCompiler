CoffeeScriptCompiler
===========================

CoffeeScript compiler plugin for Codiad-IDE.

This plugin compiles the current CoffeeScript file on each save and gives you some 
hints if the file could not be saved due to compilation issues.

See http://coffeescript.org/ for the CoffeeScript compiler.

Also integrates coffeelint to inform the user about bad pieces of code.
See http://www.coffeelint.org/ for details of coffeelint.

Compilation and Linting is completely done in the browser, so there are no further dependencies.

Update 2016/04/17:
==================
fixed an initialization issue

Update 2015/11/09:
==================
updated CoffeeScript compiler to 1.10.0

Update 2014/09/28:
==================
updated CoffeeScript compiler to 1.8.0

Update 2014/01/23:
==================

Integrated a settings dialog to edit settings.
Enabled SourceMaps by default.
Integrated CoffeeScript header to generated source files

Update 2014/01/12:
==================

I just translated the developed javascript code to CoffeeScript.
We are talking about a CoffeeScript compiler integration here, 
so it's useful to provide the sourcecode of this plugin also written in CoffeeScript. ;-)


License
=======

The MIT License (MIT)

Copyright (c) 2013 dev-rke

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), 
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
