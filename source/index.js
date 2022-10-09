// STREAM

const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const {Blob}     = require('buffer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ejs        = require('ejs');
const express    = require('express');
const uploader   = require('express-fileupload');
const bodyParser = require('body-parser');
const cookies    = require('cookie-parser');
const api        = require('./api.js');
const db         = require('./database.js'); 
const utils      = require('./utils.js'); 

var config = {
    explorer: process.env.EXPLORER,
    neturl:   process.env.NETURL,
    network:  process.env.NETWORK,
    theme:    'dark-mode'
};

function hit(req,txt=''){ 
    console.warn(new Date().toJSON().substr(5,14).replace('T',' '), req.path, txt); 
    //console.log('MEM', process.memoryUsage());
}

async function randomAddress() {
    let buf = await crypto.randomBytes(20);
    let adr = '0x'+buf.toString('hex');
    return adr;
}

function randomString(len=10){
    let ret = '';
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    for (let i=0; i<len; ++i) {
        ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
}

// Upload to web3.storage
async function uploadFile(filePath){
    try {
        let name = path.basename(filePath)
        let byte = fs.readFileSync(filePath)
        console.log('File:', name);
        let file = new Blob([byte], { type: 'image/jpg' })
        //let file = new File([byte], name, { type: 'image/jpg' })
        let url  = 'https://api.web3.storage/upload'
        let opt  = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer '+process.env.STOREID,
          },
          body: file
        }
        let res = await fetch(url, opt);
        let inf = await res.json();
        console.log('CID', inf.cid);
        return inf.cid;
    } catch(ex) {
        console.error('Error uploading file:', ex);
        return null;
    }
}

// Upload to web3.storage
async function uploadData(fileData){
    try {
        let file = new Blob([fileData], { type: 'text/plain' })
        let url  = 'https://api.web3.storage/upload'
        let opt  = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer '+process.env.STOREID,
          },
          body: file
        }
        let res = await fetch(url, opt);
        let inf = await res.json();
        console.log('CID', inf.cid);
        return inf.cid;
    } catch(ex) {
        console.error('Error uploading file:', ex);
        return null;
    }
}


async function main(){
    console.warn(new Date(), 'App is running on', process.env.NETWORK);
    const app = express();
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(uploader());
    //app.use(express.json()) // Instead of bodyParser since express 4.16
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookies());
    app.set('views', path.join(__dirname, 'public/views'));
    app.set('view engine', 'html');
    app.engine('html', ejs.renderFile);


    //-- ROUTER

    app.get('/', async (req, res) => { 
        hit(req);
        try {
            config.user = req.cookies.account;
            config.name = req.cookies.username;
            config.strid = req.cookies.streamid;
            let stream = await db.getStreamById(config.strid);
            //console.warn('Stream', stream);
            // if address not in db then redirect to create user
            if(!stream || stream.error){
                stream = null;
            } else {
                stream.editable = true;
            }
            let trend = await db.getLatestStreams();
            let posts = await db.getLatestPosts();
            res.render('index.html', {config, stream, trend, posts, utils});
        } catch(ex) {
            console.error(new Date(), 'Server error', ex.message);
            return res.status(500).render('serverror.html');
        }
    });

    app.get('/create', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        res.render('create.html', {config});
    });

    app.get('/account', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        if(!config.user || !config.strid){
            console.warn('User not found for stream', config.strid);
            res.render('notfound.html', {config});
            return;
        }
        let stream = await db.getStreamById(config.strid);
        if(!stream || stream.error){
            console.warn('Stream not found for address', config.strid);
            res.render('notfound.html', {config});
            return;
        }
        res.render('account.html', {config, stream});
    });

    app.get('/p/:postid', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        let postid  = req.params.postid;
        //let streamid  = req.params.streamid;
        let post = await db.getPostById(postid);
        //console.warn('POST', post);
        if(!post || post.error){ 
            console.warn('Post not found for address', postid);
            res.render('notfound.html', {config});
            return;
        }
        let stream = await db.getStreamById(post.streamid);
        if(!stream || stream.error){
            console.warn('Stream not found for address', post.streamid);
            res.render('notfound.html', {config});
            return;
        }
        if(stream.owner==config.user){ stream.editable = true; }
        let trend = await db.getLatestStreams();
        let posts = await db.getLatestPosts();
        res.render('post-view.html', {config, stream, post, trend, posts, utils});
    });


    app.get('/a/:streamid', async (req, res) => { 
        hit(req);
        config.user  = req.cookies.account;
        config.name  = req.cookies.username;
        config.strid = req.cookies.streamid;
        let strid    = req.params.streamid;
        let stream   = await db.getStreamById(strid);
        //console.warn('stream', stream);
        // if address not in db then redirect to create stream
        if(!stream || stream.error){
            console.warn('Stream not found for address', strid);
            res.render('notfound.html', {config});
            return;
        }
        if(stream.owner==config.user){ stream.editable = true; }
        let trend = await db.getLatestStreams();
        let posts = await db.getLatestPosts();
        res.render('stream.html', {config, stream, trend, posts, utils});
    });

    app.get('/u/:user', async (req, res) => { 
        hit(req);
        let user = req.params.user;
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        let list = [];
        if(user.startsWith('0x') && user.length==42){
            list = await db.getStreamsByOwner(user);
        } else {
            list = await db.getStreamsByName(user);
        }
        if(!list || list.error || list.length==0){
            console.warn('Stream not found for user', user);
            res.render('notfound.html', {config});
            return;
        }
        let streamid = list[0].streamid;
        let stream = await db.getStreamById(streamid);
        //console.warn('stream', stream);
        if(!stream || stream.error){
            console.warn('Stream not found for id', streamid);
            res.render('notfound.html', {config});
            return;
        }
        if(stream.owner==config.user){ stream.editable = true; }
        let trend = await db.getLatestStreams();
        let posts = await db.getLatestPosts();
        //TODO: let roll  = await db.getStreamroll(config.user);
        res.render('stream.html', {config, stream, trend, posts, utils});
    });

    app.get('/self', async (req, res) => { 
        hit(req, req.cookies.account||'0x');
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        let list = await db.getStreamsByOwner(config.user);
        // if address not in db then redirect to create stream
        if(!list || list.error || list.length==0){
            console.warn('Stream not found for user', config.user);
            res.redirect('/create');
            return;
        } else {
            let streamid = list[0].streamid;
            let stream = await db.getStreamById(streamid);
            if(!stream || stream.error){
                console.warn('Stream not found for user', config.user);
                res.redirect('/create');
                return;
            }
            if(stream.owner==config.user){ stream.editable = true; }
            let trend = await db.getLatestStreams();
            let posts = await db.getLatestPosts();
            //console.warn('stream', stream);
            res.render('stream.html', {config, stream, trend, posts, utils});
        }
    });


    //-- API

    app.get('/api/test', (req, res) => { 
        hit(req);
        res.end('OK');
    });

    app.post('/api/account', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        if(!config.user){
            res.redirect('/');
            return;
        }
        let rec = { streamid:req.body.streamid, username:req.body.username, tagline:req.body.tagline, avatar:req.body.avatar };
        console.warn('Update account:', rec);
        let inf = await db.updateAccount(rec);
        res.end(JSON.stringify(inf));
    });

    app.post('/api/newstream', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        let rec = { streamid:req.body.strid, owner:config.user, username:req.body.uname, tagline:req.body.motto, avatar:req.body.avatar };
        console.warn('New Stream:', rec);
        let inf = await db.newStream(rec);
        res.end(JSON.stringify(inf));
    });

    app.post('/api/newpost', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        //let postid = await randomAddress();
        let post = {
            owner:    config.user,
            streamid: req.body.streamid,
            postid:   req.body.postid,
            content:  req.body.content,
            refid:    ''
        };
        //console.warn('POST:', post);
        let cid = await api.newPost(post);
        if(!cid){
            res.end('{"error":"Unknown error saving post"}');
            return;
        }
        if(cid.error){
            res.end(`{"error":"${cid.error}"}`);
            return;
        }
        let inf = {status:'OK', postid:req.body.postid, cid:cid};
        res.end(JSON.stringify(inf));
    });

    app.post('/api/editpost', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        let postid = req.body.postid;
        let post = {
            owner:    config.user,
            streamid: req.body.streamid,
            postid:   req.body.postid,
            content:  req.body.content,
            refid:    ''
        };
        let oldpost = await db.getPostById(postid);
        //console.warn('POST', post);
        if(!oldpost || oldpost.error){ 
            res.end('{"error":"Post not found"}');
            return;
        }
        if(oldpost.owner != config.user){ 
            res.end('{"error":"You are not the stream owner"}');
            return;
        }
        let cid = await api.editPost(post);
        if(!cid){
            res.end('{"error":"Unknown error saving post"}');
            return;
        }
        if(cid.error){
            res.end(`{"error":"${cid.error}"}`);
            return;
        }
        let inf = {status:'OK', postid:postid, cid:cid};
        res.end(JSON.stringify(inf));
    });

    app.post('/api/deletepost/:postid', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        let postid = req.params.postid;
        console.warn('DELETE POST:', postid, 'by', config.user);
        let post = await db.getPostById(postid);
        if(!post || post.error){ 
            res.end('{"error":"Post not found"}');
            return;
        }
        if(post.owner != config.user){ 
            res.end('{"error":"You are not the stream owner"}');
            return;
        }
        let ok = await db.deletePost(post.streamid, postid);
        if(!ok){
            res.end('{"error":"Unknown error deleting post"}');
            return;
        }
        let inf = {status:'OK'};
        res.end(JSON.stringify(inf));
    });

    app.post('/api/upload/avatar', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        console.warn('Uploading avatar...');
        console.warn('User', config.user);
        // TODO: upload file to web3.storage and get CID
        try {
            //console.warn('Files:', req.files);
            if(!req.files){
                console.error('No files uploaded');
                res.send(JSON.stringify({error:'No files uploaded'}));
                return;
            }
            if(!req.files.file){
                console.error('No avatar uploaded');
                res.send(JSON.stringify({error:'No avatar uploaded'}));
                return;
            }
            if(!req.files.file.name){
                console.error('Avatar name not found');
                res.send(JSON.stringify({error:'Avatar name not found'}));
                return;
            }
            let fileName = req.files.file.name;
            let fileHash = config.user;
            let fileData = req.files.file.data;
            console.warn('Avatar:', fileHash, fileName);
            // upload file to web3.storage and get CID
            let cid = await uploadData(fileData);
            if(!cid) { 
                console.error('Error uploading avatar');
                res.send(JSON.stringify({error:'Error uploading avatar'}));
                return;
            }
            let folder   = path.join(__dirname, 'public/avatars/');
            let filePath = folder+fileHash+'.jpg';
            let localUrl = '/avatars/'+fileHash+'.jpg';
            let fileUrl  = 'https://ipfs.io/ipfs/'+cid;
            let ok1      = await req.files.file.mv(filePath);
            res.send(JSON.stringify({refid:cid}));
        } catch(ex) {
            console.error('Error uploading avatar:', ex);
            res.send(JSON.stringify({error:'Error uploading avatar: '+ex.message}));
        }
    });

    app.post('/api/upload/image', async (req, res) => { 
        hit(req);
        config.user = req.cookies.account;
        console.warn('Uploading image...');
        console.warn('User', config.user);
        //console.warn('Headers:', req.headers);
        //console.warn('Token:', req.headers.authorization);
        let tkn = process.env.TOKENIMG;
        if(tkn!=req.headers.authorization){
            console.error('Invalid token');
            res.send(JSON.stringify({error:{message:'User not authorized to upload'}}));
            return;
        }
        try {
            //console.warn('Files:', req.files);
            if(!req.files){
                console.error('No files uploaded');
                res.send(JSON.stringify({error:{message:'No files uploaded'}}));
                return;
            }
            if(!req.files.file){
                console.error('No image uploaded');
                res.send(JSON.stringify({error:{message:'No image uploaded'}}));
                return;
            }
            if(!req.files.file.name){
                console.error('Image name not found');
                res.send(JSON.stringify({error:{message:'Image name not found'}}));
                return;
            }
            let fileName = req.files.file.name;
            let fileHash = randomString();
            let fileData = req.files.file.data;
            console.warn('Image:', fileHash, fileName);
            // upload file to web3.storage and get CID
            //let cid = randomAddress(); // get from web3.storage cid
            let cid = await uploadData(fileData);
            if(!cid) { 
                console.error('Error uploading image');
                res.send(JSON.stringify({error:{message:'Error uploading image'}}));
                return;
            }
            let folder   = path.join(__dirname, 'public/images/');
            let filePath = folder+fileHash+'.jpg';
            let localUrl = '/images/'+fileHash+'.jpg';
            let fileUrl  = 'https://ipfs.io/ipfs/'+cid;
            //let fileUrl = '/media/avatar.jpg';
            let ok1 = await req.files.file.mv(filePath);
            // save file to db
            let ok2 = await db.newImage({owner:config.user, imgid:fileHash, refid:cid});
            res.send(JSON.stringify({urls:{default:fileUrl}}));
        } catch(ex) {
            console.error('Error uploading image:', ex);
            res.send(JSON.stringify({error:{message:'Error uploading image: '+ex.message}}));
        }
    });

    app.get('/api/user/token', (req, res) => { 
        hit(req);
        //console.warn('Generating token...');
        // JWT https://jwt.io/#debugger-io
        let tkn = process.env.TOKENIMG;
        res.end(tkn);
    });

    app.get('/api/getstreamname/:account', async (req, res) => { 
        //hit(req);
        let data = await db.getStreamName(req.params.account);
        if(!data || data.error){
            //console.warn('Stream not found', req.params.account);
            res.end(JSON.stringify({error:'Stream not found'}));
            return;
        } else {
            res.end(JSON.stringify(data));
            return;
        }
    });

    app.get('/api/like/:postid', async (req, res) => { 
        hit(req);
        let userid = req.cookies.account;
        let postid = req.params.postid;
        if(!userid){ 
            res.end(JSON.stringify({ok:-2})); // not registered
            return;
        }
        let data = await db.getUserLike(postid, userid);
        if(!data){
            let ok = await db.setUserLike(postid, userid);
            res.end(JSON.stringify({ok:1}));  // like
        } else if(data.error){
            res.end(JSON.stringify({ok:-1})); // error
        } else {
            let ok = await db.delUserLike(postid, userid);
            res.end(JSON.stringify({ok:0}));  // unlike
        }
    });

    app.get('/api/follow/:streamid', async (req, res) => { 
        hit(req);
        let userid = req.cookies.account;
        let streamid = req.params.streamid;  // +follower
        let mystream = req.cookies.streamid; // +following
        if(!userid || !mystream){
            res.end(JSON.stringify({ok:-2})); // not registered
            return;
        }
        let data = await db.getFollower(streamid, userid);
        if(!data){
            let ok = await db.setFollower(streamid, userid, mystream);
            res.end(JSON.stringify({ok:1}));  // follow
        } else if(data.error){
            res.end(JSON.stringify({ok:-1})); // error
        } else {
            let ok = await db.delFollower(streamid, userid, mystream);
            res.end(JSON.stringify({ok:0}));  // unfollow
        }
    });


    //-- UTILS 

    app.get('/api/*', (req, res) => { 
        hit(req, 'not found');
        res.status(404).end('{"error":"Resource not found"}'); // Catch all
    });

    app.get('*', (req, res) => { 
        hit(req, 'not found');
        config.user = req.cookies.account;
        config.name = req.cookies.username;
        config.strid = req.cookies.streamid;
        res.status(404).render('notfound.html', {config}); // Catch all
    });

    app.listen(5000);
    //app.listen();
}

main();

// END