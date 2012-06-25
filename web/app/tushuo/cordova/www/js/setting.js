(function(){

var set = QW.ObjectH.set;
var get = QW.ObjectH.get;

var Setting = {

	set: function(key, value){
		var data = localStorage.get('setting') || {};
        set(data, key, value);
		localStorage.set('setting', data);
	},
	get: function (key){
		var data = localStorage.get('setting') || {};
		return get(data, key);
	},
	del: function(key){
		return Setting.set(key, null);	
	}
};

QW.provide('Setting', Setting);

})();