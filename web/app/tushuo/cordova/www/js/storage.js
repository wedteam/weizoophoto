(function(){

Storage.prototype.token = 5; //更新此token则Storage失效

Storage.prototype.set = function(key, value){
    this.setItem(key, JSON.stringify({token: this.token, data:value}));
}

Storage.prototype.get = function(key, value){
    var data = JSON.parse(this.getItem(key));
    if(data == null) return null;
    if(data.token != this.token){ 
        //如果token过期，则storage失效
        delete this[key];
        return null;
    }
    return data.data;
}

Storage.prototype.del = function(key){
    delete this[key];
}

Storage.prototype.size = function(key){
    var data = this.getItem(key) || '';
    return ((data.length / (1024 * 1024)) | 0).toFixed(2);
}

})();