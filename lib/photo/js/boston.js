(function(){
	//boston
	parser = require("parser");

	parser.on('load', function(){
		var data = {title:document.title, sub:[], photos:[]};
		var subs = document.querySelectorAll('h2 a');

		if(subs.length > 1){
			/*for(var i = 0; i < subs.length; i++){
				data.sub.push(subs[i].getAttribute('href'));
			}*/
			data.sub.push(subs[0].getAttribute('href')); //只取最新的
		}else if(subs.length == 1){
			var photos =  document.querySelectorAll('.bpImage');
			var referer = location.href;
			var title = subs[0].innerHTML;
			var descs = document.querySelectorAll('.bpCaption');

			for(var i = 0; i < photos.length; i++){
				var sourceurl = photos[i].src;
				var filename = md5(sourceurl);

				data.photos.push({
									filename:filename, 
									cateid: 3,	//新闻类
									sourceurl:sourceurl, 
									title:title, 
									description:descs[i].innerHTML, 
									referer: referer
								});
			}					
		}
		var json = require('object.h').stringify(data);
		alert(json);	
		__callback__(json); //call Spider.onparsed			
	});
})();