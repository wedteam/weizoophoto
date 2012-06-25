//保存数据到本地
function saveImgs(id, offset, pages){
    var appData = localStorage.get(app.name);

    if(appData == null){
        appData = {}; //新建存储
        appData[id] = {imgs : []};
    }
    
    var imgs = appData[id].imgs;

    for(var i = 0; i < pages.length; i++){
        imgs[offset + i] = pages[i];
    }
    localStorage.set(app.name, appData);
}

//从本地读取数据
function loadImgs(id, limit, offset){
    var appData = localStorage.get(app.name);

    if(appData == null || appData[id] == null) return null;

    var imgs = appData[id].imgs, ret = [], total = appData[id].total;
    for(var i = 0; i < limit; i++){
        if(offset + i >= total) break;
        if(imgs[offset + i] != null) 
            ret.push(imgs[offset + i]);
    }
    return {imgs:ret, total:appData[id].total};
}

//存储类别
function saveCates(data){
    var appData = localStorage.get(app.name) || {};
    appData.cates = data;
    localStorage.set(app.name, appData);
}

//读取类别
function loadCates(){
    var appData = localStorage.get(app.name);
    return appData ? appData.cates : null;
}

//更新类目的条目数，并刷新本地存储数据
function update_cate(id, total){
    if(!QW.Connection.online){
        //没有网络时不更新类目条目
        return;
    }
    totla = total || 0;
    var appData = localStorage.get(app.name);
    
    if(appData == null){
        appData = {};
    }
    if(appData[id] == null){
        appData[id] = {total: 0, imgs:[]};
    }
    var count = total - appData[id].total;
    appData[id].total = total;
    var cate = appData[id];
    if(count > 0 && cate.imgs.length > 0){ //如果有缓存页面并且总条目数更新了
        cate.imgs = (new Array(count)).concat(cate.imgs);
    }

    localStorage.set(app.name, appData);
}