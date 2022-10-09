// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

// Stream v2.0
contract Stream {

//- LOGS

    event logInit(address indexed account, uint indexed date, string name);
    event logProfile(address indexed account, uint indexed date, string name, string tagline, string avatar);
    event logPost(uint indexed postid, uint indexed date, string refid);
    event logReply(uint indexed postid, uint replyid, uint indexed date, string refid);
    event logEdit(uint indexed postid, uint indexed date, string oldid, string newid);
    event logDelete(uint indexed postid, uint indexed date, string refid);
    event logDelReply(uint indexed postid, uint indexed replyid, uint indexed date);
    event logPurge(uint indexed postid, uint indexed date);
    event logAddFollower(uint indexed date, address user);
    event logDelFollower(uint indexed date, address user);
    event logAddFollowing(uint indexed date, address user);
    event logDelFollowing(uint indexed date, address user);
    event logLike(uint indexed postid, uint indexed date, address user);
    event logUnlike(uint indexed postid, uint indexed date, address user);
    event logBlocked(uint indexed date, address user);
    event logUnblocked(uint indexed date, address user);

//- VARS

    address internal owner;

    struct Profile {
        address account;     // Contract id
        uint    created;
        string  username;
        string  tagline;
        string  avatar;      // IPFS id
        string  stylesheet;
        uint    followers;
        uint    following;
    }

    struct Post {
        uint   postid;       // Hex id
        uint   date;
        string refid;        // IPFS id that points to post text
        uint   likes;
        uint   unlikes;
    }

    struct Reply {
        uint   postid;       // Hex id
        uint   replyid;      // Hex id
        uint   date;
        string refid;        // IPFS id that points to post text
        uint   likes;
        uint   unlikes;
        bool   inactive;
    }


    Profile     profile;
    uint public postcnt  = 0;
    uint public replycnt = 0;
    uint[]      listposts;     // All posts in chronological order
    uint[]      listreplies;   // All replies in chronological order
    address[]   followers;     // Users following this account
    address[]   following;     // Users being followed by this account
    address[]   blocked;       // Blocked users can't reply, like or follow

    mapping(uint => Post)      postsbyid;
    mapping(uint => Reply)     repliesbyid;  // replyid -> reply
    mapping(uint => string[])  posthistory;
    mapping(uint => address[]) postlikes;    // postid  -> users
    mapping(uint => uint[])    postreplies;  // postid  -> replies
    mapping(address => bool)   isblocked;    // userid  -> true


//- MODS

    bool private mutex; // reentry check

    modifier admin() {
        require(msg.sender==owner, 'ERR_UNAUTHORIZED');
        _;
    }

    modifier lock() {
        require(!mutex, "ERR_INVALIDREENTRY");
        mutex = true;
        _;
        mutex = false;
    }

    modifier vlock() {
        require(!mutex, "ERR_INVALIDREENTRY");
        _;
    }


//- MAIN

    constructor(string memory name, string memory tagline, string memory avatar) {
        owner = msg.sender;
        profile.account  = address(this);
        profile.created  = block.timestamp;
        profile.username = name;
        profile.tagline  = tagline;
        profile.avatar   = avatar;
        emit logInit(address(this), block.timestamp, name);
    }

    //function randomId() public view returns (uint) {
    //    uint a = 0;
    //    bytes20 b = bytes20(keccak256(msg.sender, block.timestamp));
    //    for (uint i = b.length-1; i+1 > 0; i--) {
    //        a += uint(b[i]) * (16**((b.length-i-1)*2));
    //    }
    //    return a;  // address(a) for hex address
    //}

    function editProfile(string memory name, string memory tagl, string memory avtr) external lock admin {
        if(bytes(name).length>0){ profile.username = name; }
        if(bytes(tagl).length>0){ profile.tagline  = tagl; }
        if(bytes(avtr).length>0){ profile.avatar   = avtr; }
        emit logProfile(profile.account, block.timestamp, name, tagl, avtr);
    }

    function newPost(uint postid, string memory refid) external lock admin {
        postcnt += 1;
        //uint postid = randomId();
        listposts.push(postid);
        // add post to postbyid
        postsbyid[postid] = Post(postid, block.timestamp, refid, 0, 0);
        // add refid to posthistory for versioning
        posthistory[postid].push(refid);
        emit logPost(postid, block.timestamp, refid);
    }

    function newReply(uint postid, uint replyid, string memory refid) external lock {
        // Check user not blocked
        require(!isblocked[msg.sender], "ERR_USERBLOCKED");
        replycnt += 1;
        //uint replyid = randomId();
        listreplies.push(postid);
        postreplies[postid].push(replyid);
        repliesbyid[replyid] = Reply(postid, replyid, block.timestamp, refid, 0, 0, false);
        emit logReply(postid, replyid, block.timestamp, refid);
    }

    function getPost(uint postid) public view returns (Post memory) {
        return postsbyid[postid];
    }

    function getPosts() public view returns (uint[] memory) {
        return listposts;  // TODO: max 100 posts
    }

    function getReply(uint replyid) public view returns (Reply memory) {
        return repliesbyid[replyid];
    }

    function getReplies(uint postid) public view returns (uint[] memory) {
        return postreplies[postid];  // TODO: max 100 replies
    }

    function editPost(uint postid, string memory refid) external lock admin {
        // check post exists
        require(postsbyid[postid].date>0, "ERR_NOTFOUND");
        // update post with IPFS id for new content
        string memory oldid = postsbyid[postid].refid;
        postsbyid[postid].refid = refid;
        // Add IPFS id to versions
        posthistory[postid].push(refid);
        emit logEdit(postid, block.timestamp, oldid, refid);
    }

    function postLike(uint postid) external lock {
        require(postsbyid[postid].date>0, "ERR_NOTFOUND");
        bool found = false;
        for(uint i=0; i<postlikes[postid].length; i++){
            if(postlikes[postid][i]==msg.sender) { found=true; break; }
        }
        if(!found){
            postsbyid[postid].likes += 1;
            postlikes[postid].push(msg.sender);
            emit logLike(postid, block.timestamp, msg.sender);
        }
    }

    function postUnlike(uint postid) external lock {
        require(postsbyid[postid].date>0, "ERR_NOTFOUND");
        bool found = false;
        uint pos = 0;
        for(uint i=0; i<postlikes[postid].length; i++){
            if(postlikes[postid][i]==msg.sender) { found=true; pos=i; break; }
        }
        if(found){
            postsbyid[postid].likes -= 1;
            postlikes[postid][pos] = postlikes[postid][postlikes[postid].length-1];
            delete postlikes[postid][postlikes[postid].length-1]; 
            emit logUnlike(postid, block.timestamp, msg.sender);
        }
    }

    function deletePost(uint postid) external lock admin {
        // check post exists
        require(postsbyid[postid].date>0, 'ERR_NOTFOUND');
        // update post with refid = 0
        string memory oldid = postsbyid[postid].refid;
        postsbyid[postid].refid = "";
        emit logDelete(postid, block.timestamp, oldid);
    }

    function deleteReply(uint postid, uint replyid) external lock admin {
        uint pos = 0;
        bool found = false;
        uint cnt = postreplies[postid].length;
        for(uint i=0; i<cnt; i++){
            if(postreplies[postid][i]==replyid) { found=true; pos=i; break; }
        }
        if(found){
            postreplies[postid][pos] = postreplies[postid][cnt-1];
            delete postreplies[postid][cnt-1];
            emit logDelReply(postid, replyid, block.timestamp);
        }
    }

    function purgePost(uint postid) external lock admin {
        // check post exists
        require(postsbyid[postid].date>0, 'ERR_NOTFOUND');
        // erase everything from post
        //string memory oldid = postsbyid[postid].refid;
        postsbyid[postid].date = 0;
        postsbyid[postid].refid = "";
        posthistory[postid] = new string[](0);
        emit logPurge(postid, block.timestamp);
    }

    function getHistory(uint postid) public view returns (string[] memory) {
        return posthistory[postid];
    }

    function getProfile() public view returns (Profile memory) {
        return profile;
    }

    // When following, you add yourself to their accounts as follower and add their accounts to your contract as following, same for unfollowing

    function addFollower() external lock {
        followers.push(msg.sender);
        profile.followers += 1;
        emit logAddFollower(block.timestamp, msg.sender);
    }

    function delFollower() external lock {
        uint pos = 0;
        bool found = false;
        for(uint i=0; i<followers.length; i++){
            if(followers[i]==msg.sender) { found=true; pos=i; break; }
        }
        if(found){
            followers[pos] = followers[followers.length-1];
            delete followers[followers.length-1];
            profile.followers -= 1;
            emit logDelFollower(block.timestamp, msg.sender);
        }
    }

    function addFollowing(address user) external lock admin {
        following.push(user);
        profile.following += 1;
        emit logAddFollowing(block.timestamp, msg.sender);
    }

    function delFollowing(address user) external lock admin {
        uint pos = 0;
        bool found = false;
        for(uint i=0; i<following.length; i++){
            if(following[i]==user) { found=true; pos=i; break; }
        }
        if(found){
            following[pos] = following[following.length-1];
            delete following[following.length-1];
            profile.following -= 1;
            emit logDelFollowing(block.timestamp, msg.sender);
        }
    }

    function getFollowers(uint start, uint limit) public view returns (address[] memory) {
        uint cnt = followers.length;
        if(start<1){ start = 0; }
        if(limit<1){ limit = 100; }
        if(start>cnt){ start = cnt; }
        if(start+limit>cnt){ limit = cnt-start; }
        address[] memory list = new address[](limit);
        uint pos = 0;
        for(uint i=0; i<limit; i++){
            pos = start+i;
            if(pos>=cnt){ break; }
            list[i] = followers[pos];
        }
        return list;
    }

    function getFollowings(uint start, uint limit) public view returns (address[] memory) {
        uint cnt = following.length;
        if(start<1){ start = 0; }
        if(limit<1){ limit = 100; }
        if(start>cnt){ start = cnt; }
        if(start+limit>cnt){ limit = cnt-start; }
        address[] memory list = new address[](limit);
        uint pos = 0;
        for(uint i=0; i<limit; i++){
            pos = start+i;
            if(pos>=cnt){ break; }
            list[i] = following[pos];
        }
        return list;
    }

    function blockUser(address user) external lock admin {
        blocked.push(user);
        isblocked[user] = true;
        emit logBlocked(block.timestamp, user);
    }

    function unblockUser(address user) external lock admin {
        uint pos = 0;
        bool found = false;
        for(uint i=0; i<blocked.length; i++){
            if(blocked[i]==user) { found=true; pos=i; break; }
        }
        if(found){
            blocked[pos] = blocked[blocked.length-1];
            delete blocked[blocked.length-1];
            isblocked[user] = false;
            delete isblocked[user];
            emit logUnblocked(block.timestamp, user);
        }
    }

    function getBlocked(uint start, uint limit) public view returns (address[] memory) {
        uint cnt = blocked.length;
        if(start<1){ start = 0; }
        if(limit<1){ limit = 100; }
        if(start>cnt){ start = cnt; }
        if(start+limit>cnt){ limit = cnt-start; }
        address[] memory list = new address[](limit);
        uint pos = 0;
        for(uint i=0; i<limit; i++){
            pos = start+i;
            if(pos>=cnt){ break; }
            list[i] = blocked[pos];
        }
        return list;
    }


//-- ADMIN

    function getOwner() public view returns (address) {
        return owner;
    }

    function setOwner(address any) external lock admin {
        owner = any;
    }

}

//- END