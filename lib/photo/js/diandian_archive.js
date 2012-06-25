(function(){
	//点点存档
	parser = require("parser");

	parser.on('load', function(){
		var subs = document.querySelectorAll('a.post-meta');

		if(subs.length){
			var data = {title:'', photos:[], sub:[]};
			for(var i = 0; i < subs.length; i++){
				data.sub.push(subs[i].getAttribute('href'));
			}
			var json = require('object.h').stringify(data);
			alert(json);	
			__callback__(json); //call Spider.onparsed				
		}else{
			var diandian = require('diandian');
			diandian.parse();
		}
	});	
})();