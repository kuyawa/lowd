// common.js

let session = {
	account : null,
	username: null,
	streamid: null,
	chainid : null,
	endpoint: 'https://testnet-rpc.coinex.net',
	explorer: 'https://testnet.coinex.net',
	network : 'testnet',
	gasPrice: 500000000000,
	gasLimit: 5000000
};


function $(id){ return document.getElementById(id) }

function setCookie(name, value, days) {
    var expires = '';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
	let path = '; path=/';
    //document.cookie = `${name}=${value}${expires}${path}`;
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
    let value = null;
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(nameEQ) == 0) { value = c.substring(nameEQ.length, c.length); break; }
    }
    return value;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        console.log('Copying to clipboard was successful!');
    }, function(err) {
        console.error('Could not copy to clipboard:', err);
    });
}

function timeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = seconds / 31536000;
    if (interval > 1) {
    	let n = Math.floor(interval);
        return  n + ' year' + (n==1?'':'s');
    }
    interval = seconds / 2592000;
    if (interval > 1) {
    	let n = Math.floor(interval);
        return n + ' month' + (n==1?'':'s');
    }
    interval = seconds / 86400;
    if (interval > 1) {
    	let n = Math.floor(interval);
        return n + ' day' + (n==1?'':'s');
    }
    interval = seconds / 3600;
    if (interval > 1) {
    	let n = Math.floor(interval);
        return n + ' hour' + (n==1?'':'s');
    }
    interval = seconds / 60;
    if (interval > 1) {
    	let n = Math.floor(interval);
        return n + ' minute' + (n==1?'':'s');
    }
    interval = seconds;
    let n = Math.floor(interval);
    if(n==0){ return 'seconds'; }
    return n + ' second' + (n==1?'':'s');
}

function randomAddress() {
    let buf = crypto.getRandomValues(new Uint8Array(20));
    let adr = '0x'+Array.from(buf).map(x=>{return x.toString(16).padStart(2,'0')}).join('');
    return adr;
}

async function connectWallet(enable=true) {
	console.log('Connecting...');
	await Metamask.start(enable);
	//if(enable){ await Metamask.wallet.enable(); }
	let account = await Metamask.getAccount();
	if(!account || !account.address){
		console.log('Account not found');
		return;
	}
	console.log('Account', account);
	session.account = account.address.toLowerCase();
	setCookie('account', session.account);
	let res = await fetch('/api/getstreamname/'+session.account);
	let inf = await res.json();
	if(!inf || inf.error){
		console.log('Stream not found');
		session.streamid = null;
		session.username = null;
		session.tagline  = null;
		setCookie('srteamid', '');
		setCookie('username', '');
		setCookie('tagline' , '');
		showAccount(session.account);
	} else {
		session.streamid = inf.streamid;
		session.username = inf.username;
		session.tagline  = inf.tagline;
		setCookie('streamid', inf.streamid);
		setCookie('username', inf.username);
		setCookie('tagline' , inf.tagline||'');
		showStream(session.streamid, session.username);
	}
}

async function reconnectWallet() {
	console.log('Reconnecting...');
	session.account = window.Metamask.myaccount.toLowerCase();
	setCookie('account', session.account);
	let res = await fetch('/api/getstreamname/'+session.account);
	let inf = await res.json();
	if(!inf || inf.error){
		console.log('Stream not found');
		session.streamid = null;
		session.username = null;
		setCookie('streamid', '');
		setCookie('username', '');
		showAccount(session.account);
	} else {
		session.streamid = inf.streamid;
		session.username = inf.username;
		setCookie('streamid', inf.streamid);
		setCookie('username', inf.username);
		showStream(session.streamid, session.username);
	}
}

function showStream(streamid, username){
	console.log('Stream:', streamid, username);
	if(username){ text = username; }
	else { text = 'My stream '+streamid.substr(0,10); }
	$('access').innerHTML  = `<a href="/a/${streamid}">${text}</a>`;
	$('connect').innerHTML = 'Connected';
}

function showAccount(address){
	console.log('Account', address);
	let long  = address;
	//let short = address.substr(0,6)+'...'+address.substr(38);
	let short = address.substr(0,8); //+' &raquo;'
	$('access').innerHTML  = `<a href="/u/${long}">Account ${short}</a>`;
	$('connect').innerHTML = 'Connected';
}

function showMessage(txt, silent){
	if(!silent){ console.log('>', txt); }
	$('message').innerHTML = txt;
	$('message').style.backgroundColor = 'transparent';
	//$('message').style.backgroundColor = '#ffffff11';
}

function showError(msg){
	console.error(msg);
	$('message').innerHTML = msg;
	$('message').style.backgroundColor = '#ff000022';
}


function countChars(evt){
	let cnt = $('content').value.length;
	let lft = 500 - cnt;
	let msg = lft + ' chars remaining...';
	showMessage(msg, true);
	//if(lft==0){ 
	//	evt.preventDefault();
	//	evt.stopPropagation();
	//	return false;
	//}
}

/*
async function nextPostId(streamid){
	try {
		let ctr = new web3.eth.Contract(contractAbi, streamid);
		ctr.defaultAccount = session.account;
		//let gax = await ctr.methods.postid().estimateGas();
		//console.log('GAX', gax);
		//return;
		let inf = { from: session.account, gasPrice: session.gasPrice, gas: session.gasLimit };
		let rex = await ctr.methods.postid().call(inf);
		console.log('REX', rex);
		let pid = parseInt(rex)+1;
		if(rex) {
			//showMessage('Post ID: '+pid);
			return pid;
		} else {
			showError('Error getting post id');
		}
	} catch(ex){
		console.error(ex);
		showError('Error creating post: '+ex.message);
	}
	return 0;
}
*/

function embedYoutube(url) {
	return `<p><iframe width="560" height="315" src="${url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>`;
}

function parseUrls(txt) {
    let rex = /(https?:\/\/[^\s]+)/g;
    let res = txt.replace(rex, function(url){
        // IMAGES
        if(url.indexOf('.jpg')>0
        || url.indexOf('.jpeg')>0
        || url.indexOf('.png')>0
        || url.indexOf('.gif')>0
        || url.indexOf('.webp')>0
        || url.indexOf('.svg')>0){
            return '<p><img class="lowd-image" src="'+url+'"></p>';
        } 
        // AUDIO
        else if(url.indexOf('.mp3')>0){ return '<p><audio controls class="lowd-audio"><source src="'+url+'" type="audio/mpeg"></audio></p>'; }
        else if(url.indexOf('.ogg')>0){ return '<p><audio controls class="lowd-audio"><source src="'+url+'" type="audio/ogg"></audio></p>'; }
        // VIDEO
        else if(url.indexOf('.mp4') >0){ return '<p><video controls class="lowd-video"><source src="'+url+'" type="video/mp4"></video></p>'; }
        else if(url.indexOf('.mov') >0){ return '<p><video controls class="lowd-video"><source src="'+url+'" type="video/quicktime"></video></p>'; }
        else if(url.indexOf('.webm')>0){ return '<p><video controls class="lowd-video"><source src="'+url+'" type="video/webm"></video></p>'; }
        else if(url.startsWith('https://www.youtube.com/watch?v=')){ return `<p><iframe class="lowd-youtube" src="${url.replace('watch?v=','embed/')}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>`; }
        else if(url.startsWith('https://youtu.be/')){ return `<p><iframe class="lowd-youtube" src="${url.replace('youtu.be','youtube.com/embed/')}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>`; }
        else {
            return url;
            //return '<a href="' + url + '">' + url + '</a>' + '<br/>'
        }    
    }) 
    return res;
}

function addPost(data){
	let list = $('articles');
	let item = $('tmp-newpost').innerHTML;
	item = item.replace(/{postid}/g,   data.postid)
		       .replace(/{streamid}/g, data.streamid)
		       .replace('{owner}',     data.owner)
		       .replace('{username}',  data.username)
		       .replace('{tagline}',   data.tagline)
		       .replace('{created}',   timeAgo(data.created))
		       .replace('{content}',   parseUrls(data.content))
		       .replace('{likes}',     data.likes)
		       .replace('{replies}',   data.replies)
		       .replace('{follow}',    data.follow);
	list.innerHTML = item + list.innerHTML;
}

function clearForm(){
	$('content').value = '';
	$('buttonsay').disabled = false;
	$('buttonsay').innerHTML = 'SAY IT LOWD';
}

async function newPost(streamid, content){
	showMessage('Creating post, wait a moment...');
	try {
		if(!session.streamid){ showError('Metamask not connected'); return; };
		//let postid = await nextPostId(session.streamid);
		let postid = randomAddress();
		//if(postid<1){ showError('Can not connect to stream, try again...'); return; }
		// Save to database
		var form = new FormData();
		form.append('streamid', streamid);
		form.append('postid',   postid);
		form.append('content',  content);
		let opt = {
			method: 'POST',
			body: form
		}
		let res = await fetch('/api/newpost', opt);
		let dat = await res.json();
		console.log('DATA', dat);
		if(!dat || dat.error){
			showError('Error saving post: '+dat.error);
			return;
		}
		// Save to contract
		let ctr = new web3.eth.Contract(contractAbi, streamid);
		ctr.defaultAccount = session.account;
		//let gax = await ctr.methods.newPost(postid, cid).estimateGas();
		//console.log('GAX', gax)
		let inf = { from: session.account, gasPrice: session.gasPrice, gas: session.gasLimit };
		let rex = await ctr.methods.newPost(postid, dat.cid).send(inf);
		console.log('REX', rex);
		if(rex) {
			showMessage('New post created');
			clearForm();
			//let item = { postid:'123', streamid:'0x321', owner:'0x456', username:'Kaimare', tagline:'King of the world', created:'2022-10-01 12:00', content:'This is a test', likes:1, replies:2, follow:3, editable:false }
			let item = {
				postid:   postid,
				streamid: streamid,
				owner:    session.account,
				username: session.username,
				tagline:  session.tagline||'',
				created:  new Date(),
				content:  content,
				likes:    0,
				replies:  0,
				follow:   0,
				editable: true
			}
			addPost(item);
			return true;
		} else {
			showError('Error creating post');
			// TODO: remove temp post
		}
	} catch(ex){
		console.error(ex);
		showError('Error creating post: '+ex.message);
	}
}


function strip(html){
   let doc = new DOMParser().parseFromString(html, 'text/html');
   return doc.body.textContent || "";
}

async function sayit(){
	let text = $('content').value;
	text = strip(text);
	$('content').value = text;
	//let media = $('media').value;
	console.log('TEXT', text);
	//console.log('MEDIA', media);
	let strid = getCookie('streamid');
	if(!strid){
		window.location.href = '/create'; // Redirect to create
		return;
	} else {
		// Save message to blockchain and db
		//if(media){
		//	text += '\n\n'+media;
		//}
		$('buttonsay').disabled = true;
		$('buttonsay').innerHTML = 'WAIT';
		let ok = await newPost(strid, text);
	}
}

async function onFollow(streamid){
	//
}

async function follow(obj, streamid){
	function setText(obj,txt){ obj.innerHTML = txt; }
	let oldText = obj.innerHTML;
	obj.innerHTML = 'Wait...';
	console.log('On follow', streamid);
	// Follow on contract
	// Follow on server and db
	try {
		if(!session.streamid){ setText(obj,'Not registered'); return; };
		// Save to contract
		let ctr = new web3.eth.Contract(contractAbi, streamid);
		ctr.defaultAccount = session.account;
		//let gax = await ctr.methods.addFollower().estimateGas();
		//console.log('GAX', gax)
		let inf = { from: session.account, gasPrice: session.gasPrice, gas: session.gasLimit };
		let rex = await ctr.methods.addFollower().send(inf);
		console.log('REX', rex);
		if(rex.status){
			// save to db
			let res = await fetch('/api/follow/'+streamid);
			let dat = await res.json();
			console.log('DATA', dat);
			if(!dat || dat.error){
				setText(obj,'Error 101');
				return;
			}
			let cnt = parseInt(obj.innerHTML.split(' ')[0])||0;
			console.log('CNT', cnt);
			switch(dat.ok){
				case -2: break; // not registered
				case -1: break; // error
				case  0: cnt = cnt-1; obj.innerHTML = cnt+' Follower'+(cnt==1?'':'s'); break; // unfollow
				case  1: cnt = cnt+1; obj.innerHTML = cnt+' Follower'+(cnt==1?'':'s'); break; // follow
			}
		} else {
			setText(obj,'Error 102');
		}
	} catch(ex){
		console.error(ex);
		setText(obj,'Error 109');
	}

}

async function likeit(obj, postid){
	console.log('On like', postid);
	console.log('Event', obj);
	// Like on server and db
	let res = await fetch('/api/like/'+postid);
	let inf = await res.json();
	console.log('Liked:', inf);
	let cnt = parseInt(obj.innerHTML.split(' ')[0]);
	console.log('CNT', cnt);
	switch(inf.ok){
		case -2: break; // not registered
		case -1: break; // error
		case  0: cnt = cnt-1; obj.innerHTML = cnt+' Like'+(cnt==1?'':'s'); break; // unlike
		case  1: cnt = cnt+1; obj.innerHTML = cnt+' Like'+(cnt==1?'':'s'); break; // like
	}
}

async function reply(obj, postid){
	console.log('On reply', postid);
	// Follow on contract
	// Follow on server and db
}

async function main(){
	console.log('LOWD 1.0');
	let streamid = getCookie('streamid');
	let username = getCookie('username');
	if(!streamid){
		await connectWallet(false);
	} else {
		await connectWallet(true);
		showStream(streamid, username);
	}
	if(window['start']) { start(); }
}

window.onload = main;

// END