// UI Utils

function dateLong(date) {
    var opt = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    };
    return (new Date(date)).toLocaleDateString('en', opt);
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

function plural(cnt, sng, plr) {
    return cnt + ' ' + (cnt==1?sng:plr);
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
    if(n<5){ return 'seconds'; }
    return n + ' second' + (n==1?'':'s');
}

module.exports = {
    dateLong,
    parseUrls,
    plural,
    timeAgo
};

// END