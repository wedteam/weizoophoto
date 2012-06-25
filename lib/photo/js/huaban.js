(function(){
	//花瓣
	parser = require("parser");

	parser.on('load', function(){
		var data = {title:document.title, sub:[], photos:[]};

		var photo = document.querySelector('#pin_img img');
		if(photo){
			var sourceurl = photo.src;
			var filename = md5(sourceurl);
			var referer = location.href;
			var title = document.title;
			var desc = document.querySelector('#pin_caption p');
			desc = desc ? desc.innerHTML : '';

			data.photos.push({
								filename:filename, 
								cateid: 2,	//时尚（美女）类
								sourceurl:sourceurl, 
								title:title, 
								description:desc, 
								referer: referer
							});	
		}else{
			var subs = document.querySelectorAll('.pin > a.x');
			var sub = null;

			for(var i = 0; i < subs.length; i++){	

				sub = "http://" + location.hostname + subs[i].getAttribute('href'); 
				data.sub.push(sub);
			}
			if(sub){
				var matched = sub.match(/\/(\w+)\/$/); //取最后一张图片，作为新的开始页
				if(matched){
					var last_id = matched[1];
					data.sub.push(location.href.replace(/since=\d+/, "since="+last_id));
				}
			}
		}
		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed		
	});
})();