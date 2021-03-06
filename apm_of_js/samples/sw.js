/*!
 * async await
 */
var {trace, id, compose} = require('./utils')

const doAsyncIO = value => resolve => setTimeout(()=>compose(resolve, trace)(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = (v番茄块, v鸡蛋块) => new Promise(doAsyncIO('番茄炒鸡蛋'))

/* 执行任务 */
exports.exec = async function(err = false){
	let pErr = new Promise((resolve, reject)=>setTimeout(()=>reject(Error('鸡蛋坏了!')), Math.random() * 1000))
	try{
		var p番茄块 = a('番茄')
		var v蛋液 = await (err ? pErr : (pErr.catch(e=>{}), b('鸡蛋')))
		var v半熟的鸡蛋 = await c(v蛋液)
		var v鸡蛋块 = await d(v半熟的鸡蛋)
		var v番茄块 = await p番茄块
		var v番茄抄鸡蛋 = await e(v番茄块, v鸡蛋块)
	}
	catch(e){
		console.log(1)
	}
}
