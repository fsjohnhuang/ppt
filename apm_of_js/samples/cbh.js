/*!
 * Callback Hell
 */
var {trace, id, compose} = require('./utils')

const doAsyncIO = (task, value, cb) => {
	setTimeout(()=>compose(cb, trace, task.done)(value), Math.random() * 2000)
}

/* 定义任务 */
//番茄切块
const a = (v番茄, cb = id) => doAsyncIO(a, '番茄块', cb)

//将鸡蛋打成蛋液
const b = (v鸡蛋, cb = id) => doAsyncIO(b, '蛋液', cb)

// 蛋液煮成半熟
const c = (v蛋液, cb = id) => doAsyncIO(c, '半熟的鸡蛋', cb)

// 切成蛋块
const d = (v半熟的鸡蛋, cb = id) => doAsyncIO(d, '鸡蛋块', cb)

// 番茄与鸡蛋块一起炒熟
const e = (v番茄块, v鸡蛋块, cb = id) => doAsyncIO(e, '番茄炒鸡蛋', cb)

const cbh = module.exports = function(){
	[a,b,c,d,e].forEach(task =>{
		task.state = {done: false}
		task.done = value => {
			task.state = {value, done: true}
			return value
		}
	})
}

cbh.exec = function(){
	/* 执行任务 */
	a('番茄')
	b('鸡蛋', function(v蛋液){
		c(v蛋液, function(v半熟的鸡蛋){
			d(v半熟的鸡蛋)
		})
	})
	poll = () => {
		if (a.state.done && d.state.done){
			e(a.state.value, d.state.value)
		}
		else{
			setTimeout(poll, 100)
		}
	}
	setTimeout(poll, 0)
}
