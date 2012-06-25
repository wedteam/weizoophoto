(function(){

	parser = require("parser")
	parser.on('load', function(){
		//凤凰网一周扫街图
		var title = document.querySelector('title').innerHTML;
		var photos = document.querySelectorAll('#allbigpic dl');

		var data = {title:title, photos:[]};

		// keys = ('filename', 'cateid', 'createdate', 'updatedate', 'expiredate', 'sourceurl', 'referer', 'title', 'description')

		for(var i = 0; i < photos.length; i++){
			var photoEl = photos[i];

			var sourceurl = photoEl.querySelector("dt img").getAttribute("src");
			var filename = md5(sourceurl);

			var title = photoEl.querySelector("dd h2").innerText;
			var desc = photoEl.querySelector("dd p").childNodes[0];

			var cateid = 1;
			var referer = location.href;

			data.photos.push({
								filename:filename, 
								cateid: cateid,
								sourceurl:sourceurl, 
								title:title, 
								description:desc, 
								referer: referer
							});
		}

		var json = require('object.h').stringify(data);

		__callback__(json); //call Spider.onparsed
	});

})();