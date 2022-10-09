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
		console.log('File', file);
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

async function updateContract(newName, newMotto, newAvatar){
	console.log('Update:', newName, newMotto, newAvatar);
	showMessage('Updating account, it may take a minute...');
	try {
		let ctr = new web3.eth.Contract(contractAbi, stream.streamid);
		ctr.defaultAccount = session.account;
		let inf = { from: session.account, gasPrice: session.gasPrice, gas: session.gasLimit };
		let res = await ctr.methods.editProfile(newName, newMotto, newAvatar).send(inf);
		console.log('RES',res);
		let ok = res.status;
		if(!ok) {
			showError('Error updating account, try again');
			actionButton('UPDATE');
			return false;
		}
		return true;
	} catch(ex){
		console.error(ex);
		showError('Error updating account: '+ex.message);
		actionButton('UPDATE');
		return false;
	}
}

async function updateProfile(streamid, username, tagline, avatar) {
	showMessage('Updating profile...');
	console.log(streamid, username, tagline, avatar);
	// Upload to server
	var data = new FormData();
	data.append('streamid',   streamid);
	data.append('username', username);
	data.append('tagline',  tagline);
	data.append('avatar',   avatar);
	try {
		let res = await fetch('/api/account', {method: "POST", body: data});
		let rex = await res.json();
		if(!rex) { showError('Unknown error updating account'); return false; }
		if(rex.error) { showError('Error updating account: '+rex.error); return false; }
		return true;
	} catch(ex){
		console.error('Update account error: ', ex);
		showError('Update account error: '+ex.message);
		return false;
	}
}

async function onUpdate() {
	if(!session.account){ 
		showError('Metamask not connected'); 
		return;
	}
	actionButton('Wait', true);
	showMessage('Updating account, wait a second...');
	//let streamid = getCookie('streamid');
	//let streamid = session.streamid;
	//let streamid = Metamask.wallet.selectedAddress;
	let username= $('uname').value;
	let motto   = $('motto').value;
	let filex   = $('filex').files[0];
	let avatar  = stream.avatar; // use old avatar if no new image
	console.log('Filex', filex);
	if(filex){
		avatar  = await uploadAvatar(filex);
	}
	let newData = {username, motto, avatar};
	let oldData = {
		username: stream.username,
		motto:    stream.tagline,
		avatar:   stream.avatar
	};
	console.log('Update:', oldData, newData);
	showMessage('Updating account, it may take a minute...');
	let ok1 = await updateContract(username, motto, avatar);
	console.log('Updating', ok1);
	if(ok1){
		let ok2 = await updateProfile(stream.streamid, username, motto, avatar);
		console.log('Updated', ok2);
		showMessage('Your account has been updated!');
		actionButton('Done', true);
	}
}


// END