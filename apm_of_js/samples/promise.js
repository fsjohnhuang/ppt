/*!
 * Promise
 */
var {trace, id, compose} = require('./utils')

const doAsyncIO = value => resolve => setTimeout(()=>compose(resolve, trace)(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = ([v番茄块, v鸡蛋块]) => {
	new Promise(doAsyncIO('番茄炒鸡蛋'))
}

/* 执行任务 */
exports.exec = function(err = false){
	let pErr = new Promise((resolve, reject)=>setTimeout(()=>reject(Error('鸡蛋坏了!')), Math.random() * 1000))
	Promise.all([
		a('番茄'),
		(err ? pErr : b('鸡蛋')).then(c).then(d)
	]).then(e, e => console.log(1))
}

/*
p = b('鸡蛋')
	.then(v蛋液 => {
		return c(v蛋液)
	})
	.then(v半熟的鸡蛋 => {
		return d(v半熟的鸡蛋)
	})

p.then(v鸡蛋块 => {
	// 想得到鸡蛋块　和　蛋液
})

p = b('鸡蛋')
	.then(v蛋液 => {
		return c(v蛋液) //任务c的返回值要变化
	})
	.then([v蛋液, v半熟的鸡蛋] => {
		return d([v蛋液, v半熟的鸡蛋])//任务d的入参和返回值要变化
	})
	但任务ｃ的初衷不是这个，而v蛋液对任务ｄ毫无意义
*/
