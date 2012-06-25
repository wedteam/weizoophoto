(function(){
	//tumblr存档
	parser = require("parser");

	parser.on('load', function(){
		var subs = document.querySelectorAll('a.photo');
		if(subs.length){
			var data = {title:document.title, photos:[], sub:[]};
			for(var i = 0; i < subs.length; i++){
				data.sub.push(subs[i].getAttribute('href'));
			}
			var json = require('object.h').stringify(data);
			alert(json);
			__callback__(json); //call Spider.onparsed						
		}else{
			require('tumblr').parse();
		}
	});	
})();