function doTaskA(arg1, arg2){
	return new Promise((res, rej) => {
		//rej('error')
		throw Error()
	})
}

function doTaskB(arg, cb){
	console.log(arg)
	cb('next')
}

async function Factory(){
	try{
		let v = await doTaskA()
		v.catch(_=>console.log(1))
	}
	catch(e){
		console.log(e)
	}
	console.log(2)
}

Factory()
/*c = Factory()
nxt = c.next()
c.next(nxt.value)*/
//p.catch(_=> console.log(1))
