(function(){
	//点点摄影
	parser = require("parser");

	function parse(){
		var data = {title:document.title, sub:[], photos:[]};

		var title = document.title;
		var referer = location.href;
		var desc = '点点的页面结构太坑爹，完全没规律，只能匹配到img了，描述神马的去源页面摘下来编辑吧。。';

		var imgs = document.querySelectorAll('img');

		for(var i = 0; i < imgs.length; i++){
			img = imgs[i];
			var sourceurl = img.src;
			if(img.parentNode && img.parentNode.tagName == "A"){
				sourceurl = img.parentNode.getAttribute('href');
			}
			var m;
			if(m = sourceurl.match(/^http\:\/\/m[1-3]\.img\.libdd\.com\/.*?(\d+)_(\d+)\.\w+$/)){
				var width = parseInt(m[1]);
				var height = parseInt(m[2]);
				if(width < height){
					var tmp = width;
					width = height;
					height = width;
				}
				if(width >= 640 && height >= 480){
					data.photos.push({
										filename:md5(sourceurl), 
										cateid: photo_type || 1,
										sourceurl:sourceurl, 
										title:title, 
										description:desc, 
										referer: referer
									});
				}
			}
		}


		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed	
	}

	parser.on('load', parse);

	exports = {parse:parse};
})();