(function(){

	//http://news.qq.com/photo.shtml

	parser = require("parser");
	
	parser.on('load', function(){

		if(window.data){
			// keys = ('filename', 'cateid', 'createdate', 'updatedate', 'expiredate', 'sourceurl', 'referer', 'title', 'description')		
			var _data = window.data.Children[0].Children[1];
			var photos = _data.Children;

			var data = {title:document.title, photos:[]};

			for(var i = 0; i < photos.length; i++){
				var sourceurl = photos[i].Children[2].Children[0].Content;
				var filename = md5(sourceurl);
				var title = photos[i].Children[0].Children[0].Content;
				var desc = photos[i].Children[3].Children[0].Content;

				var cateid = 3; //news
				var referer = photos[i].Children[6].Children[0].Content;

				data.photos.push({
									filename:filename, 
									cateid: cateid,
									sourceurl:sourceurl, 
									title:title, 
									description:desc, 
									referer: referer
								});

			}

		}else{
			//alert(document.body);
			var data = {title:document.title, sub:[]};

			var scripts = document.getElementsByTagName('script');

			for(var i = 0; i < scripts.length; i++){
				var code = scripts[i].innerHTML;
				var matches = code.match(/slink:.*(?=\#p\=1)/mg);

				if(matches){
					for(var j = 0; j < matches.length; j++){
						var match = matches[j];

						target = match.split(/:\s*'\s*/).pop().replace('htm', 'hdBigPic.js');
						data.sub.push(target);
					}
				}
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed
	});

})();