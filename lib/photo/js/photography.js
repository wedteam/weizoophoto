(function(){
	//国家地理杂志
	//http://photography.nationalgeographic.com/photography/photo-of-the-day/
	parser = require("parser");

	parser.on('load', function(){
		var photo = document.querySelector(".primary_photo img");
		if(photo){
			var data = {title:document.title, sub:[], photos:[]};

			var sourceurl = photo.src;
			var download_link = document.querySelector(".download_link a");
			if(download_link){ //如果有更高质量的1600*1200的图
				sourceurl = download_link.getAttribute('href');
			}

			var pre = document.querySelector(".primary_photo a");
			if(pre){
				var sub = "http://" + location.hostname + pre.getAttribute('href');
				data.sub.push(sub);
			}

			var filename = md5(sourceurl);
			var title = document.querySelector('#caption h2').innerHTML;
			var referer = location.href;
			var desc = document.querySelector('#caption').innerHTML;

			data.photos.push({
								filename:filename, 
								cateid: 4,	//地理类
								sourceurl:sourceurl, 
								title:title, 
								description:desc, 
								referer: referer
							});		

			var json = require('object.h').stringify(data);
			alert(json);
			__callback__(json); //call Spider.onparsed
		}
	});
})();