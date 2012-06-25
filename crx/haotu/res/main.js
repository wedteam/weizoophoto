/**
* haotu 主文件
**/
var HAOTU = {
    api : 'http://m.weizoo.com/api/'
};

function get_cates(){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", HAOTU.api + 'get_cates', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var catesData = JSON.parse(xhr.responseText);
            if(catesData.err == 'ok'){
                HAOTU.cate = catesData.data;
            }
        }
    }
    xhr.send();
}

/*转化json成query串*/
function obj2query(d){
    var queryStr = [];
    for(i in d){
        queryStr.push(i + '=' + encodeURIComponent(d[i]));
    }
    return queryStr.join('&');
}

/*创建右键菜单*/
var haotuContextMenusId = chrome.contextMenus.create({
    title : 'Pick this image',
    contexts : ['image']
}, function(){
    /*创建分类右键菜单*/
    var _cate = HAOTU.cate;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", HAOTU.api + 'get_cates', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var catesData = JSON.parse(xhr.responseText);
            if(catesData.err == 'ok'){
                var _cate = catesData.data;
                for(menuCate in _cate){
                    (function(c){
                        chrome.contextMenus.create({
                            title : _cate[c],
                            contexts : ['image'],
                            parentId : haotuContextMenusId,
                            onclick : function(info, tab){                    
                                /*调用Content Scripts*/
                                chrome.tabs.sendRequest(
                                    //当前tabid
                                    tab.id,
                                    /*需要发送给content script的数据*/
                                    {
                                        sourceurl  : info.srcUrl,  //图片地址
                                        cateid : c,            //图片分类
                                        referer  : info.pageUrl  //当前页面url
                                    },
                                    function(ret){
                                        /*发送数据到服务器*/
                                        if(!ret){
                                            return;
                                        }
                                        var xhr = new XMLHttpRequest();
                                        xhr.open("GET", HAOTU.api + 'add?' + obj2query(ret), true);
                                        xhr.onreadystatechange = function() {
                                            if (xhr.readyState == 4) {
                                                var resp = JSON.parse(xhr.responseText);
                                            }
                                        }
                                        xhr.send();
                                    }
                                ); 
                            }
                        }, function(){
                        });
                    })(menuCate);
                }
            }
        }
    }
    xhr.send();    
});