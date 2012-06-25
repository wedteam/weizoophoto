(function(){
	//推他摄影
	parser = require("parser");

	parser.on('load', function(){
		var data = {title:document.title, sub:[], photos:[]};

		var title = document.querySelector('.post_info h2.title');
		title = title ? title.innerHTML : '';
		var referer = location.href;

		var photo_group = document.querySelector('.photo_group');
		var single_photo = document.querySelector('.photo_box');
		
		if(single_photo){ //单张照片
			var sourceurl = single_photo.querySelector('a').getAttribute('href');
			var filename = md5(sourceurl);
			var desc = single_photo.querySelector('.info').innerHTML;
			data.photos.push({
								filename:filename, 
								cateid: photo_type || 1,
								sourceurl:sourceurl, 
								title:title, 
								description:desc, 
								referer: referer
							});
		}

		if(photo_group){ //多张照片
			var photos = photo_group.querySelectorAll('.pic a'),
				infos = photo_group.querySelectorAll('.info');

			for(var i = 0; i < photos.length; i++){
				var photo = photos[i];

				var sourceurl = photo.getAttribute('href');
				var filename = md5(sourceurl);
				var desc = infos[i].innerHTML;

				data.photos.push({
									filename:filename, 
									cateid: photo_type || 1,	//摄影类
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