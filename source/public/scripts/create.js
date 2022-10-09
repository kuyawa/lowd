// create.js

function actionButton(title, disable){
	$('create').innerHTML = title;
	$('create').disabled  = disable;
}

function showMessage(msg){
	console.log(msg);
	$('message').innerHTML = msg;
	$('message').style.backgroundColor = '#ffffff11';
}

function showError(msg){
	console.error(msg);
	$('message').innerHTML = msg;
	$('message').style.backgroundColor = '#ff000022';
}

function onPreviewFile(input) {
    //var file = document.getElementById('file').files[0];
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        $('file-img').src = e.target.result;
        $('file-name').innerHTML = file.name;
		console.log('File:', file.name, file);
		//console.log($('token-file').value);
    }
    reader.readAsDataURL(file);
}

function avatarHash(){
	let len = 10;
    let ret = '';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < len; ++i) {
        ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret+'.jpg';
}

async function uploadAvatar(file){
	showMessage('Uploading avatar, wait a moment...');
	try {
		var data = new FormData();
		data.append('file', file);
		let res = await fetch('/api/upload/avatar', {method: "POST", body: data});
		let inf = await res.json();
		console.log('Avatar', inf);
		if(!inf){ showError('Avatar could not be uploaded'); return null; }
		if(inf.error){ showError('Avatar could not be uploaded: '+inf.error); return null; }
		return inf.refid;
	} catch(ex) {
		console.error(ex);
		showError('Error uploading avatar: '+ex.message);
	}
}

async function newStream(uname='', motto='', avatar=''){
	console.log('Stream:', uname, motto, avatar);
	showMessage('Creating account, it may take a minute...');
	try {
		let ctr = new web3.eth.Contract(contractAbi);
		ctr.defaultAccount = session.account;
	    let arg = [uname, motto, avatar];
		let val = { arguments: arg, data: contractBin };
		//let ctd = await ctr.deploy(val);
		//let gax = await ctd.estimateGas();
		//console.log('GAS', gax)
		let inf = { from: session.account, gasPrice: session.gasPrice, gas: session.gasLimit };
		let res = await ctr.deploy(val).send(inf);
		console.log('RES',res);
		let adr = res._address;
		console.log('STREAM ADDRESS', adr);
		if(adr) {
			// Show address to user
			adr = adr.toLowerCase();
			$('address').innerHTML = adr;
			$('gotohome').href = '/a/'+adr;
			$('results').style.display = 'block';
			return adr;
		} else {
			// error creating account
			showError('Error creating account, try again');
		}
	} catch(ex){
		console.error(ex);
		showError('Error creating account: '+ex.message);
	}
}

async function createProfile(strid, uname, motto, avatar) {
	showMessage('Saving profile...');
	console.log(strid, uname, motto, avatar);
	// Upload to server
	var data = new FormData();
	data.append('strid',  strid);
	data.append('uname',  uname);
	data.append('motto',  motto);
	data.append('avatar', avatar);
	try {
		let res = await fetch('/api/newstream', {method: "POST", body: data});
		let rex = await res.json();
		if(!rex) { showError('Unknown error saving account'); return null; }
		if(rex.error) { showError('Error saving account: '+rex.error); return null; }
		if(!rex.id) { showError('Error saving account, no record generated'); return null; }
		return rex.id;
	} catch(ex){
		console.error('Upload error: ', ex);
		showError('Upload error: '+ex.message);
		return null;
	}
}

async function onCreate() {
	if(!session.account){ 
		showError('Metamask not connected'); 
		return;
	}
	actionButton('Wait', true);
	showMessage('Creating account, wait a second...'); 
	let uname = $('uname').value;
	let motto = $('motto').value;
	let filex = $('filex').files[0];
	let avatr = await uploadAvatar(filex);
	let strid = await newStream(uname, motto, avatr);  // TODO: get payment $5
	if(strid){
		let ok = await createProfile(strid, uname, motto, avatr);
		console.log('OK', ok);
		setCookie('streamid', strid);
		setCookie('username', uname);
		showMessage('Your account is ready!');
		actionButton('Done', true);
	} else {
		actionButton('Create');
	}
}


// END