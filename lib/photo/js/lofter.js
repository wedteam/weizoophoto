(function(){
	//lofter摄影
	parser = require("parser");

	function parse(){
		var data = {title:document.title, sub:[], photos:[]};

		var title = document.getElementsByTagName('title')[0];
		title = title ? title.innerHTML : '';
		var referer = location.href;

		var photos = document.querySelectorAll('.photo a, .postphoto a');
		var desc = document.querySelector('.photo .text');

		if(photos.length){
			for(var i = 0; i < photos.length; i++){
				var photo = photos[i];
				var sourceurl = photo.getAttribute('bigimgsrc');
				if(sourceurl){
					var desc = desc ? desc.innerHTML : '';

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