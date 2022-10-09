// WALLET

let web3 = null;


async function onWalletConnect(info) {
	console.log('Metamask onConnect', info);
	window.Metamask.setNetwork(info.chainId);
	//loadWallet();
}

async function onWalletDisconnect(info) {
	console.log('Metamask onDisconnect', info)
	console.log('Disconnected')
}

async function onWalletAccounts(info) {
	console.log('Metamask onAccounts', info)
	window.Metamask.accounts  = info;
	window.Metamask.myaccount = info[0];
	console.log('My account', window.Metamask.myaccount);
	reconnectWallet();
	//window.Metamask.getBalance(window.Metamask.myaccount);
}

async function onWalletChain(chainId) {
	console.log('Metamask onChain', chainId)
	if(chainId==window.Metamask.chainId) { console.log('Already on chain', chainId); return; }
	window.Metamask.setNetwork(chainId);
	//window.Metamask.loadWallet();
	//requestAccount();
	//getAccounts();
}

async function onWalletMessage(info) {
	console.log('Metamask onMessage', info)
}


class Wallet {
    constructor(){
		this.MAINCHAIN = 52;
		this.TESTCHAIN = 53;
		this.MAINURL   = 'https://rpc.coinex.net';
		this.TESTURL   = 'https://testnet-rpc.coinex.net';
		this.MAINEXP   = 'https://www.coinex.net';
		this.TESTEXP   = 'https://testnet.coinex.net';
		this.wallet    = null;
		this.accounts  = [];
		this.myaccount = null;
		this.chainId   = null;
		this.mainnet   = null;
		this.network   = null;
		this.neturl    = null;
		this.explorer  = null;
		this._connected = false;
	}

	async start(enable=true){
		if(window.ethereum && window.ethereum.isMetaMask){
	    	console.log('Metamask is present');
			web3 = new Web3(window.ethereum);
			//web3 = new Web3(this.TESTURL);
	    	this.wallet = window.ethereum;
	    	//this.wallet.getAccount = async function() {
	    	//	let accts = await web3.eth.getAccounts();
	    	//	if(accts.length>0) { return {address:accts[0].toLowerCase()}; }
	    	//	else { return {address:null}; }
	    	//}
			this.wallet.on('connect', onWalletConnect);
			this.wallet.on('disconnect', onWalletDisconnect);
			this.wallet.on('accountsChanged', onWalletAccounts);
			this.wallet.on('chainChanged', onWalletChain);
			this.wallet.on('message', onWalletMessage);
			console.log('Listeners set');
	    	
	    	if(enable){ this.wallet.enable(); }

			//web3 = new Web3(this.neturl);
			//console.log('WEB3', web3);
			//console.log('VER', web3.version)

			let cid = await web3.eth.getChainId();
			console.log('ChainId', cid);
			if(cid==this.MAINCHAIN || cid==this.TESTCHAIN){
				// CHAIN OK
			} else {
				this.chainId = cid;
				//this.wallet = null;
				//web3 = null;
				console.log('Metamask not connected to CoinEx');
				if(enable){ alert('Metamask not connected to CoinEx'); }
			}
		} else {
	    	console.log('Metamask not available');
	    }
	}

	async getAccount(){
		let accts = await web3.eth.getAccounts();
		if(accts.length>0) { return {address:accts[0].toLowerCase()}; }
		else { return {address:null}; }
		//return await this.wallet.getAccount()
	}

	async getBalance(adr){
		console.log('Get balance...', adr);
		let res, bal;
		try {
			res = await web3.eth.getBalance(adr);
			console.log('Balance', adr.substr(0,8), res);
			//bal = (parseInt(res)/10**18).toLocaleString('en-US', { useGrouping: true, minimumFractionDigits: 4, maximumFractionDigits: 4});
			bal = (parseInt(res)/10**18);
			//$('user-address').innerHTML = 'Address: '+adr.substr(0,10); 
	    	//$('user-balance').innerHTML = 'Balance: '+bal+' BNB';
		} catch(ex) {
			console.log('Metamask error', ex)
			bal = 0.0;
		}
		return bal;
	}

	async getGasPrice() {
	    let gas = await web3.eth.getGasPrice();
	    console.log('Gas price:', gas);
	    return gas;
	}

	async setNetwork(chain) {
		console.log('ChainID', chain);
	}

	async connect() {
	    //window.ethereum.enable();
		let acts = await window.ethereum.request({method:"eth_requestAccounts", params:[{eth_accounts: {}}]});
		console.log('ACTS', acts);
	}
}

window.Metamask = new Wallet();

// END