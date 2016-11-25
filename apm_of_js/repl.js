var fs = require('fs')
var path = require('path')
var repl = require('repl')

var r = repl.start('> ')
var ctx = r.context

ctx._load = function(modulePath){
	var m = modulePath.split('/').pop()
	ctx[m] = require(modulePath)
	if ('function' === typeof ctx[m]){
		ctx[m]()
	}
}

var defaultMP = process.argv.splice(2,1).pop()
if (defaultMP) {
	ctx._load(defaultMP)
}

ctx.reload = function(module){
	var dir = path.resolve(__dirname, module)
	for (var i in require.cache){
		if (i.indexOf(dir) === 0){
			delete require.cache[i]
		}
	}
	ctx._load(module)
	console.log('Reload is OK!')
}
