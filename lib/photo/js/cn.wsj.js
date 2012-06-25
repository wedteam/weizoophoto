(function(){
	//cn.wsj
	parser = require("parser");

	parser.on('load', function(){
		var data = {title:document.title, sub:[], photos:[]};
		var subs = document.querySelectorAll('#top2right1 img');
		divs = document.querySelectorAll('body > div');
		alert(divs.length);
		if(subs.length > 0){
			for(var i = 0; i < subs.length; i++){
				var sub = subs[i].parentNode.getAttribute('href');
				if(sub){
					data.sub.push(sub);
				}
			}
		}
		var json = require('object.h').stringify(data);
		alert(json);	
		//__callback__(json); //call Spider.onparsed			
	});
})();