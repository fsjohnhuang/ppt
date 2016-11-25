var moment = require('moment')
/* 帮助工具 */
exports.trace = x => {
	console.log('%s %s', moment().format('HH:mm:ss'), x)
	return x
}
exports.id = x => x
exports.compose = (...fns) => {
	const lastFn = fns.pop()
	fns = fns.reverse()
	return a => fns.reduce((p, fn) => fn(p), lastFn(a))
}
