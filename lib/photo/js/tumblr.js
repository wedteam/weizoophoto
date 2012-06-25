(function(){
	//tumblr存档
	parser = require("parser");

	function parse(){
		var data = {title:document.title, sub:[], photos:[]};

		var photos = document.querySelectorAll('.photo-highres a, .photo > a, .photo > img');
		var desc = document.querySelector('.caption');
		desc = desc ? desc.innerHTML : '';
		var referer = location.href;

		for(var i = 0; i < photos.length; i++){
			var photo = photos[i];
			var sourceurl = photo.getAttribute('href') || photo.src;
			if(sourceurl){
				data.photos.push({
						filename:md5(sourceurl), 
						cateid: photo_type || 1,	
						sourceurl:sourceurl, 
						title:document.title, 
						description:desc, 
						referer: referer				
				});
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed	
	}

	parser.on('load', parse);	

	exports = {parse:parse};
})();