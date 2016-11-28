# Agenda
1.从Callback Hell说起
2.初次尝试——EventProxy
3.曙光的出现——Promise
4.真正的光明——Coroutine
5.语法级支持——async和await

## 重申主题
&emsp;《异步编程模型》这个名称确实不太直观，其实今天我想和大家分享的就是上面的代码是如何演进成下面的代码而已。
```
a(function(){
	b(function(){
		c(function(){
			d()
		})
	})
})
```
TO
```
;(async function(){
	await a()
	await b()
	await c()
	await d()
}())
```

## 写在前面
&emsp;我们知道JavaScript是单线程运行的(撇开Web Worker)，并且JavaScript线程执行时浏览器GUI渲染线程无法抢占CPU时间片，因此假如我们通过以下代码实现60秒后执行某项操作
```
const deadline = Date.now() + 60000
while(deadline > Date.now());
console.log('doSomething')
```
那么浏览器将假死60秒。正常情况下我们采用异步调用的方式来实现
```
const deadline = Date.now() + 60000
;(function _(){
	if (deadline > Date.now()){
		setTimeout(_, 100)
	}
	else{
		console.log('doSomething')
	}
}())
```
那到底上述两种方式有什么不同呢？

到这里我有个疑问，那就是到底什么才叫做异步呢？既然有异步，那必然有同步，那同步又是什么呢？谈起同步和异步，那必不可少地要提起阻塞和非阻塞，那它们又是什么意思呢？

谈到它们那必须联系到IO来说了
阻塞: 就是JS线程发起阻塞IO后，JS线程什么都不做就等则阻塞IO响应。
非阻塞: 就是JS线程发起非阻塞IO后，JS线程可以做其他事，然后通过轮询、信号量等方式通知JS线程获取IO响应结果。
也就是说阻塞和非阻塞描述的是发起IO和获取IO响应之间的时间里,JS线程是否可以继续处理其他任务。
而同步和异步则是描述另一个方面。
首先当我们发起网络IO请求时，应用程序会向OS发起系统调用，然后内核会调用驱动程序操作网卡，然后网卡得到的数据会先存放在内核空间中(应用程序是读取不了的)，然后将数据从内核空间拷贝到用户空间。抽象一下就是，发起IO请求会涉及到用户空间和内核空间间的数据通信。

同步: 应用程序需要显式地将数据从内核空间拷贝到用户空间中，然后再使用数据。
异步: 将数据从内核空间拷贝到用户空间的操作由系统自动处理，然后通知应用程序直接使用数据即可。

对于如setTimeout等方法而已，本来就存在用户空间和内核空间的数据通信问题，因此异步更多是描述非阻塞这一特性。
那么异步调用的特点就是：
1. 非阻塞
2. 操作结果将于不明确的未来返回

## 从Callback Hell说起
举个栗子——番茄炒蛋
番茄切块(代号a)
鸡蛋打成蛋液(代号b)
蛋液煮成半熟(代号c)
将蛋切成块(代号d)
番茄与鸡蛋块一起炒熟(代号e)

### 假设个步骤都是同步IO时
->番茄切块->鸡蛋打成蛋液->蛋液煮成半熟->将蛋切成块->番茄与鸡蛋块一起炒熟
```
a()
b()
c()
d()
e()
```

### 假设个步骤都是异步IO时
&emsp;情况1——所有步骤均无状态依赖
->番茄切块
->鸡蛋打成蛋液
->蛋液煮成半熟
->将蛋切成块
->番茄与鸡蛋块一起炒熟
```
a()
b()
c()
d()
e()
```

&emsp;情况2——步骤间存在线性的状态依赖
->番茄切块->鸡蛋打成蛋液->蛋液煮成半熟->将蛋切成块->番茄与鸡蛋块一起炒熟
```
a('番茄', function(v番茄块){
	b('鸡蛋', function(v蛋液){
		c(v蛋液, function(v半熟的鸡蛋){
			d(v半熟的鸡蛋, function(v鸡蛋块){
				e(v番茄块, v鸡蛋块)
			})
		})
	})
})
```
这就是Callback Hell了


&emsp;情况3——步骤间存在复杂的状态依赖
异步执行：->番茄切块														|->番茄与鸡蛋块一起炒熟
					->鸡蛋打成蛋液->蛋液煮成半熟->切成蛋块|

异步调用所带来的问题是
1. 状态依赖关系难以表达，更无法使用`if...else`,`while`等流程控制语句。
2. 无法提供`try...catch`异常机制来处理异常

## 初次尝试——EventProxy
EventProxy作为一个事件系统，通过after、tail等事件订阅方法提供带约束的事件触发机制，“约束”对应“前置条件”，因此我们可以利用这种带约束的事件触发机制来作为异步执行模式下的流程控制表达方式。
```
const doAsyncIO = (value, cb) => setTimeout(()=>cb(value), Math.random() * 1000)
const ep = new EventProxy()

/* 定义任务 */
const a = v番茄 => doAsyncIO('番茄块', ep.emit.bind(ep,'a'))
const b = v鸡蛋 => doAsyncIO('蛋液', ep.emit.bind(ep,'b'))
const c = v蛋液 => doAsyncIO('半熟的鸡蛋', ep.emit.bind(ep,'c'))
const d = v半熟的鸡蛋 => doAsyncIO('鸡蛋块', ep.emit.bind(ep,'d'))
const e = (v番茄块, v鸡蛋块) => doAsyncIO('番茄炒鸡蛋', ep.emit.bind(ep,'e'))

/* 定义任务间的状态依赖 */
ep.once('b',c)
ep.once('c',d)
ep.all('a', 'd', e)

/* 执行任务 */
a()
b()
```
另外通过`error`事件提供对异常机制的支持
```
ep.on('error', err => {
	console.log(err)
})
```
但由于EventProxy采用事件机制来做流程控制，而事件机制好处是降低模块的耦合度，但从另一个角度来说会使整个系统结构松散难以看出主干模块，因此通过事件机制实现流程控制必然导致代码结构松散和逻辑离散，不过这可以良好的组织形式来让代码结构更紧密一些。

## 曙光的出现——Promise
这里的Promise指的是已经被ES6纳入囊中的Promises/A+规范及其实现.
Promise相当于我们去麦当劳点餐后得到的小票，在未来某个时间点拿着小票就可以拿到食物。不同的是，只要我们持有Promise实例，无论索取多少次，都能拿到同样的结果。而麦当劳显然只能给你一份食物而已。
代码表现如下
```
const p1 = new Promise(function(resolve, reject){
	/*	工厂函数
	 *	resolve函数表示当前Promise正常结束, 例子:　setTimeout(()=>resolve('bingo'), 1000)
	 *	reject函数表示当前Promise发生异常, 例子:　setTimeout(()=>reject(Error('OMG!')), 1000)
	 */
})
const p2 = p1.then(
	function fulfilled(val){
		return val + 1
	}
	, function rejected(err){
		/*处理p1工厂函数中调用reject传递来的值*/
	}
)
const p3 = p2.then(
	function fulfilled(val){
		return new Promise(function(resolve){setTimeout(()=>resolve(val+1), 10000)})
	}
	, function rejected(err){
		/*处理p1或p2调用reject或throw error的值*/
	}
)
p3.catch(function rejected(err){
		/*处理p1或p2或p3调用reject或throw error的值*/
	}
)
```
Promises/A+中规定Promise状态为pending（默认值）、fulfilled或rejected，其中状态仅能从pending->fulfilled或pending->rejected，并且可通过then和catch订阅状态变化事件。状态变化事件的回调函数执行结果会影响Promise链中下一个Promise实例的状态。另外在触发Promise状态变化时是可以携带附加信息的，并且该附加信息将沿着Promise链被一直传递下去直到被某个Promise的事件回调函数接收为止。而且Promise还提供Promise.all和Promise.race两个帮助方法来实现与或的逻辑关系，提供Promsie.resolve来将thenable对象转换为Promise对象。
API:
`new Promise(function(resolve, reject){})`, 带工厂函数的构造函数
`Promise.prototype.then(fulfilled()=>{}, rejected()=>{})`，订阅Promise实例状态从pending到fulfilled，和从pending到rejected的变化
`Promise.prototype.catch(rejected()=>{})`，订阅Promise实例状态从pending到rejected的变化
`Promise.resolve(val)`, 生成一个状态为fulfilled的Promise实例
`Promise.reject(val)`, 生成一个状态为rejected的Promise实例
`Promise.all(array)`, 生成一个Promise实例，当array中所有Promise实例状态均为fulfilled时，该Promise实例的状态将从pending转换为fulfilled，若array中某个Promise实例的状态为rejected，则该实例的状态将从pending转换为rejected.
`Promise.race(array)`, 生成一个Promise实例,当array中某个Promise实例状态发生转换，那么该Promise实例也随之转

```
const doAsyncIO = value => resolve => setTimeout(()=>resolve(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = ([v番茄块, v鸡蛋块]) => new Promise(doAsyncIO('番茄炒鸡蛋'))

/* 执行任务 */
Promise.all([
	a('番茄'),
	b('鸡蛋').then(c).then(d)
]).then(e)
	.catch(err=>{
		console.log(err)
	})
```
最大特点：独立的可存储的异步调用结果
其他特点：fulfilled和rejected函数异步执行

jQuery作为前端必备工具,也为我们提供类似与Promise的工具，那就是jQuery.Deffered
```
const deffered = $.getJSON('dummy.js')
deffered.then(function(val1){
	console.log(val1)
	return !val1
},function (err){
	console.log(err)
}).then(function(val2){
	console.log(val2)
})
```
但jQuery.Deferred并不是完整的Promise/A+的实现。
如:
1. jQuery1.8之前上述代码val2的值与val1一样，jQuery1.8及以后上述代码val2的值就是!val1了。
2. fulfilled和rejected函数采用同步执行

遗留问题！
```
const a = () => Promise.resolve('a')
const b = (v1) => Promise.resolve('b')
const c = (v2, v1) => console.log(v1)

a().then(b).then(c)
```

## 真正的光明——Coroutine
&emsp;Coroutine中文就是协程，意思就是线程间采用协同合作的方式工作，而不是抢占式的方式工作。由于JS是单线程运行的，所以这里的Coroutine就是一个可以部分执行后退出，后续可在之前退出的地方继续往下执行的函数.
```
function coroutine(){
	yield console.log('c u later!')
	console.log('welcome guys!')
}
```
### Generator Function
&emsp;其实就是迭代器，跟C#的IEnumrable、IEnumerator和Java的Iterable、Iterator一样。
```
function* enumerable(){
	yield 1
	yield 2
}
for (let num of enumerable()){
	console.log(num)
}
```
&emsp;现在我们将1,2替换为代码
```
function *enumerable(msg){
  console.log(msg)
  var msg1 = yield msg + ' after ' // 断点
  console.log(msg1)
  var msg2 = yield msg1 + ' after' // 断点
  console.log(msg2 + ' over')
}
```
编译器会将上述代码转换成
```
const enumerable = function(msg){
  var state = -1

  return {
    next: function(val){
      switch(++state){
         case 0:
                  console.log(msg + ' after')
                  break
         case 1:
                  var msg1 = val
                  console.log(msg1 + ' after')
                  break
         case 2:
                  var msg2 = val
                  console.log(msg2 + ' over')
                  break
      }
    }
  }
}
```
通过调用next函数就可以从之前退出的地方继续执行了。(条件控制、循环、迭代、异常捕获处理等就更复杂了)
其实Generator Function实质上就是定义一个有限状态机，然后通过Generator Function实例的next,throw和return方法触发状态迁移。
`next(val)`, 返回`{value: val1, done: true|false}`
`throw(err)`,在上次执行的位置抛出异常
`return(val)`,状态机的状态迁移至终止态，并返回`{value: val, done: true}`
现在我们用Gererator Function来做番茄炒蛋
```
const doAsyncIO = value => (resolve) => setTimeout(()=>resolve(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = (v番茄块, v鸡蛋块) => new Promise(doAsyncIO('番茄炒鸡蛋'))

function* coroutineFunction(){
	try{
		var p番茄块 = a('番茄')
		var v蛋液 = yield b('鸡蛋')
		var v半熟的鸡蛋 = yield c(v蛋液)
		var v鸡蛋块 = yield d(v半熟的鸡蛋)
		var v番茄块 = yield p番茄块
		var v番茄抄鸡蛋 = yield e(v番茄块, v鸡蛋块)
	}
	catch(e){
		console.log(e.message)
	}
}
const coroutine = coroutineFunction()
throwError = coroutine.throw.bind(coroutine)
coroutine.next().value.then(function(v蛋液){
	coroutine.next(v蛋液).then(function(v半熟的鸡蛋){
		coroutine.next(v半熟的鸡蛋).then(function(v鸡蛋块){
			coroutine.next().then(function(v番茄块){
				coroutine.next(v番茄块).then(function(v番茄抄鸡蛋){
					coroutine.next(v番茄抄鸡蛋)
				}, throwError)
			}, throwError)
		}, throwError)
	}, throwError)
})
```
&emsp;悲催又回到Callback hell.但我们可以发现coroutineFunction其实是以同步代码的风格来定义任务间的执行顺序（状态依赖）而已，执行模块在后面这个让人头痛的Callback hell那里，并且这个Callback Hell是根据coroutineFunction的内容生成，像这种重复有意义的事情自然由机器帮我们处理最为恰当了，于是我们引入个状态管理器得到
```
const doAsyncIO = value => (resolve) => setTimeout(()=>resolve(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = (v番茄块, v鸡蛋块) => new Promise(doAsyncIO('番茄炒鸡蛋'))

function* coroutineFunction(){
	try{
		var p番茄块 = a('番茄')
		var v蛋液 = yield b('鸡蛋')
		var v半熟的鸡蛋 = yield c(v蛋液)
		var v鸡蛋块 = yield d(v半熟的鸡蛋)
		var v番茄块 = yield p番茄块
		var v番茄抄鸡蛋 = yield e(v番茄块, v鸡蛋块)
	}
	catch(e){
		console.log(e.message)
	}
}
iPromise(coroutineFunction)
```
&emsp;舒爽多了！

## async和await
ES7引入了async和await两个关键字，Node.js7支持这两货。于是Coroutine写法就更酸爽了.
```
const doAsyncIO = value => (resolve) => setTimeout(()=>resolve(value), Math.random() * 1000)

/* 定义任务 */
const a = v番茄 => new Promise(doAsyncIO('番茄块'))
const b = v鸡蛋 => new Promise(doAsyncIO('蛋液'))
const c = v蛋液 => new Promise(doAsyncIO('半熟的鸡蛋'))
const d = v半熟的鸡蛋 => new Promise(doAsyncIO('鸡蛋块'))
const e = (v番茄块, v鸡蛋块) => new Promise(doAsyncIO('番茄炒鸡蛋'))

async function coroutine(){
	try{
		var p番茄块 = a('番茄')
		var v蛋液 = await b('鸡蛋')
		var v半熟的鸡蛋 = await c(v蛋液)
		var v鸡蛋块 = await d(v半熟的鸡蛋)
		var v番茄块 = await p番茄块
		var v番茄抄鸡蛋 = await e(v番茄块, v鸡蛋块)
	}
	catch(e){
		console.log(e.message)
	}
}
coroutine()
```

## 总结
到这里各位应该会想“不就做个西红柿炒鸡蛋吗，搞这么多,至于吗？”。其实我的看法是
1. 对于状态依赖简单的情况下，callback的方式足矣;
2. 对于状态依赖复杂（譬如做个佛跳墙等大菜时），Promise或Coroutine显然会让代码更简洁直观，更容易测试因此bug更少，更容易维护因此更易被优化。

我曾梦想有一天所有浏览器都支持Promise,async和await，大家可以不明就里地写出coroutine，完美地处理异步调用的各种问题。直到有一天知道世上又多了Rxjs这货,不说了继续填坑去:)

coroutine特性:
1. non-preemptive multitasking
2. multiple entry point and multiple pathway, while subroutine just the same starting point and the same end point.
3. According to Donald Knuth, coroutine coined by Melvin Conway in 1958 applied to construction of an assembly program.first published explaination in 1963.
4. 不是parallel
