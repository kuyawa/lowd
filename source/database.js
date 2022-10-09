// DATABASE

const postgres = require('pg');
const dbconn   = process.env.DATABASE;
if(!dbconn){ console.error('DATASERVER NOT AVAILABLE'); }
const dbp = new postgres.Pool({ connectionString: dbconn });


class DataServer {
    async connect() {}
    async disconnect() {}

    async insert(sql, params, key) {
        var dbc, res, recid, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) { 
                recid = key?res.rows[0][key]:0;
                data  = { status:'OK', id: recid }; 
            }
        } catch(ex) {
            console.error('DB error on new record:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async update(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) {
                data = res.rowCount;
            } else { 
                data = 0;
            }
        } catch(ex) {
            console.error('DB error updating records:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async delete(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) {
                data = res.rowCount;
            } else { 
                data = 0;
            }
        } catch(ex) {
            console.error('DB error deleting records:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async query(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows;
            } else {
                data = [];
            }
        } catch(ex) {
            console.error('DB error in query:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryObject(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0];
            }
        } catch(ex) {
            console.error('DB error getting data object:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryValue(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0].value; // Select should have field as value
            }
        } catch(ex) {
            console.error('DB error getting data value:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }
}


const DS = new DataServer();

async function newStream(rec) {
	let sql = 'insert into users(streamid, owner, username, tagline, avatar) values($1, $2, $3, $4, $5) returning recid';
    let par = [rec.streamid, rec.owner, rec.username, rec.tagline, rec.avatar];
    let dat = await DS.insert(sql, par, 'recid');
    return dat;
}

async function updateAccount(rec) {
    let sql = 'update users set username=$1, tagline=$2, avatar=$3 where streamid = $4';
    let par = [rec.username, rec.tagline, rec.avatar, rec.streamid];
    let dat = await DS.update(sql, par);
    return dat;
}

async function getStreamById(streamid, num=20) {
    let sql1 = 'select * from users where streamid=$1';
    let sql2 = 'select * from posts where streamid=$1 order by created desc limit $2';
    let par1 = [streamid];
    let par2 = [streamid, num];
    let data = await DS.queryObject(sql1, par1);
    if(data && !data.error){
        let list = await DS.query(sql2, par2);
        data.posts = list;
    }
    return data;
}

async function getStreamsByOwner(owner, num=10) {
	let sql  = 'select * from users where owner=$1 order by created desc limit $2';
    let pars = [owner, num];
    let data = await DS.query(sql, pars);
    return data;
}

async function getStreamsByName(name, num=10) {
    let sql  = 'select * from users where lower(username)=lower($1) order by created desc limit $2';
    let pars = [name, num];
    let data = await DS.query(sql, pars);
    return data;
}

async function getStreamName(owner) {
    let sql  = 'select streamid, username, tagline from users where owner=$1 order by created desc limit 1';
    let pars = [owner];
    let data = await DS.queryObject(sql, pars);
    if(!data || data.error){ return data; }
    return data;
}

async function getLatestStreams(num=10) {
    let sql  = 'select * from users order by created desc limit $1';
    let pars = [num];
    let data = await DS.query(sql, pars);
    return data;
}

async function newPost(rec) {
    let sql = 'insert into posts(owner, streamid, postid, content, refid) values($1, $2, $3, $4, $5) returning recid';
    let par = [rec.owner, rec.streamid, rec.postid, rec.content, rec.refid];
    let dat = await DS.insert(sql, par, 'recid');
    return dat;
}

async function editPost(rec) {
    let sql = 'update posts set content=$1, refid=$2, updated=now() where postid = $3';
    let par = [rec.content, rec.refid, rec.postid];
    let dat = await DS.update(sql, par);
    return dat;
}

async function deletePost(streamid, postid) {
    let sql = 'delete from posts where streamid = $1 and postid = $2';
    let par = [streamid, postid];
    let dat = await DS.delete(sql, par);
    return dat;
}

async function getPosts(streamid, num=20) {
    let sql  = 'select p.*, u.username, u.tagline, u.avatar, u.followers from posts left outer join users u on u.owner = p.owner where streamid=$1 order by created desc limit $2';
    let pars = [streamid, num];
    let data = await DS.query(sql, pars);
    return data;
}

async function getLatestPosts(num=20) {
    let sql  = 'select p.*, u.username, u.tagline, u.avatar, u.followers' +
               '  from posts p' +
               '  left outer join users u on u.owner = p.owner' +
               '  order by created desc limit $1';
    let pars = [num];
    let data = await DS.query(sql, pars);
    return data;
}

async function getPostById(postid) {
    let sql  = 'select * from posts where postid=$1';
    let pars = [postid];
    let data = await DS.queryObject(sql, pars);
    return data;
}

async function newImage(rec) {
    let sql = 'insert into images(owner, imgid, refid) values($1, $2, $3) returning recid';
    let par = [rec.owner, rec.imgid, rec.refid];
    let dat = await DS.insert(sql, par, 'recid');
    return dat;
}

async function getUserLike(postid, userid) {
    let sql  = 'select * from likes where postid=$1 and userid=$2';
    let pars = [postid, userid];
    let data = await DS.queryObject(sql, pars);
    return data;
}

async function setUserLike(postid, userid) {
    let sql1 = 'insert into likes(postid, userid) values($1, $2)';
    let sql2 = 'update posts set likes = likes+1 where postid = $1';
    let par1 = [postid, userid];
    let par2 = [postid];
    let ok1  = await DS.insert(sql1, par1);
    let ok2  = await DS.update(sql2, par2);
    if(ok1 && ok2){ return true; }
}

async function delUserLike(postid, userid) {
    let sql1 = 'delete from likes where postid=$1 and userid=$2';
    let sql2 = 'update posts set likes = likes-1 where postid = $1';
    let par1 = [postid, userid];
    let par2 = [postid];
    let ok1  = await DS.delete(sql1, par1);
    let ok2  = await DS.update(sql2, par2);
    if(ok1 && ok2){ return true; }
}

async function getFollower(streamid, userid) {
    let sql  = 'select * from follow where streamid=$1 and follower=$2';
    let pars = [streamid, userid];
    let data = await DS.queryObject(sql, pars);
    return data;
}

async function setFollower(streamid, userid, mystream) {
    let sql1 = 'insert into follow(streamid, follower) values($1, $2)';
    let sql2 = 'update users set followers = followers+1 where streamid = $1';
    let sql3 = 'update users set following = following+1 where streamid = $1';
    let par1 = [streamid, userid];
    let par2 = [streamid];
    let par3 = [mystream];
    let ok1  = await DS.insert(sql1, par1);
    let ok2  = await DS.update(sql2, par2);
    let ok3  = await DS.update(sql3, par3);
    if(ok1 && ok2 && ok3){ return true; }
}

async function delFollower(streamid, userid, mystream) {
    let sql1 = 'delete from follow where streamid=$1 and follower=$2';
    let sql2 = 'update users set followers = followers-1 where streamid = $1';
    let sql3 = 'update users set following = following-1 where streamid = $1';
    let par1 = [streamid, userid];
    let par2 = [streamid];
    let par3 = [mystream];
    let ok1  = await DS.delete(sql1, par1);
    let ok2  = await DS.update(sql2, par2);
    let ok3  = await DS.update(sql3, par3);
    if(ok1 && ok2 && ok3){ return true; }
}



module.exports = {
	newStream,
	getStreamById,
    getStreamName,
    getStreamsByOwner,
    getStreamsByName,
    getLatestStreams,
    getLatestPosts,
    updateAccount,
    newPost,
    editPost,
    getPosts,
    getPostById,
    newImage,
    getUserLike,
    setUserLike,
    delUserLike,
    getFollower,
    setFollower,
    delFollower
}

// END