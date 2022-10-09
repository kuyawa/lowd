// api.js

let fs     = require('fs');
let path   = require('path');
let {Blob} = require('buffer');
let fetch  = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
let db     = require('./database.js');

let APITOKEN = process.env.STOREID;
//let W3S    = require('web3.storage');
//let storage  = new W3S.Web3Storage({ token: apitoken })


async function uploadText(text) {
	if(!text){ return; }
	console.warn('Uploading text...');
    try {
		//let file = new Blob([byte], { type: 'image/jpg' })
		let buffer = Buffer.from(text);
		//let file = new File([byte], name, { type: 'image/jpg' })
		let url  = 'https://api.web3.storage/upload'
		let opt  = {
		  method: 'POST',
		  headers: {
		  	Authorization: 'Bearer '+APITOKEN,
		  },
		  body: buffer
		}
		let res = await fetch(url, opt);
		let inf = await res.json();
		//console.warn('RES',res);
		console.warn('CID', inf);
		let uri = `https://${inf.cid}.ipfs.dweb.link`;
		console.warn('URI', uri);
		return inf.cid;
   	} catch(ex){
		console.error(ex);
		return {error:ex.message};
	}
}

//async function uploadTextOLD(text, name) {
//	console.warn('Uploading text...');
//    try {
//		let buffer = Buffer.from(text);
//		let files  = [new W3S.File([buffer], name)];
//		let cid    = await storage.put(files);
//		let info   = await storage.status(cid);
//		console.warn('CID', cid);
//		console.warn('Info', info);
//		return cid;
//   	} catch(ex){
//		console.error(ex);
//		return {error:ex.message};
//	}
//}

async function uploadFile(filePath){
	let name = path.basename(filePath)
	let byte = fs.readFileSync(filePath)
	console.warn('File:', name);
	let file = new Blob([byte], { type: 'image/jpg' })
	//let file = new File([byte], name, { type: 'image/jpg' })
	let url  = 'https://api.web3.storage/upload'
	let opt  = {
	  method: 'POST',
	  headers: {
	  	Authorization: 'Bearer '+APITOKEN,
	  },
	  body: file
	}
	let res = await fetch(url, opt);
	let txt = await res.text();
	console.warn('RES',res);
	console.warn('TXT',txt);
}


async function newPost(rec){
    let cid = await uploadText(rec.content);
    console.warn('POST CID', cid);
    if(!cid || cid.error){ return cid; }
    else {
    	rec.refid = cid;
    	let ok = await db.newPost(rec);
    	console.warn('DB NEW POST', ok);
    }
	return cid;
}

async function editPost(rec){
    let cid = await uploadText(rec.content);
    console.warn('POST CID', cid);
    if(!cid || cid.error){ return cid; }
    else {
    	rec.refid = cid;
    	let ok = await db.editPost(rec);
    	console.warn('DB EDIT POST', ok);
    }
	return cid;
}

//async function deletePost(postid){
//    let ok = await db.deletePost(postid);
//}


module.exports = {
	newPost,
	editPost,
	//deletePost
};

// END