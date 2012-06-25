(function(){
	parser = require("parser");
	
	parser.on('load', function(){
		var data = {title:document.title, sub:[], photos:[]};

		var details = document.querySelector('.blackarea');

		if(details){
			var href = details.getAttribute("href");
			data.sub.push(href);
		}

		var photos = document.querySelector("#photoList");
		if(photos){
			var list = photos.innerHTML;
			var temp = document.createElement('div');
			temp.innerHTML = list;
			var imgs = temp.querySelectorAll('li');
			for(var i = 0; i < imgs.length; i++){
				var img = imgs[i],
					sourceurl = img.querySelector('i').innerHTML,
					filename = md5(sourceurl),
					title = '',
					desc = img.querySelector('p').innerHTML,
					cateid = 1,
					referer = img.querySelector('a').href;

				data.photos.push({
									filename:filename, 
									cateid: cateid,
									sourceurl:sourceurl, 
									title:title, 
									description:desc, 
									referer: referer
								});				
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed
	});

})();