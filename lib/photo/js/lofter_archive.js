(function(){
	parser = require("parser");

	parser.on('load', function(){

		var subs = document.querySelectorAll('li.img a');

		if(subs.length){
			var data = {title:document.title, photos:[], sub:[]};

			for(var i = 0; i < subs.length; i++){
				data.sub.push("http://" + location.hostname + subs[i].getAttribute('href'));
			}
			var json = require('object.h').stringify(data);
			alert(json);
			__callback__(json); //call Spider.onparsed				
		}else{
			require('lofter').parse();
		}
	});
})();