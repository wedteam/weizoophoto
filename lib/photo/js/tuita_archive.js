(function(){
	//推他存档
	parser = require("parser");

	function parse_archive(data){
		var posts = data.archivePosts;
		
		var data = {title:document.title, photos:[]};

		for(var i  in posts){
			var rows = posts[i].rows;
			for(var j = 0; j < rows.length; j++){
				var photos = rows[j].post_content;
				var title = rows[j].post_title || '';
				if(photos){
					var desc = '';
					for(var k = 0; k < photos.length; k++){
						photo = photos[k];
						var sourceurl = 'http://img1.tuita.cc/' + photo.photo_url + '.' + photo.photo_type;
						var referer = 'http://imovie.tuita.com/blogpost/' + rows[j].post_id;

						if(sourceurl){
							if(photo.desc){
								desc = photo.desc;
							}

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
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);
		__callback__(json); //call Spider.onparsed			
	};

	parser.on('load', function(){
		var scripts = document.getElementsByTagName('script');
		var code = scripts[3].innerHTML.split('tuita.render')[1];
		if(code){
			eval('parse_archive'+code);
		}
	});
})();