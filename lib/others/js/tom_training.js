(function(){
	parser = require("parser");

	parser.on('load', function(){
		var params = document.querySelectorAll('param');
		var data = {sub:[], sgf_source:[]};

		if(params.length){
			data.referer = location.href;
			data.type = sgf_type || 1;
			data.site = location.hostname;

			for(var i = 0; i < params.length; i++){
				if(params[i].getAttribute('name') == "filename"){
					var src = params[i].getAttribute('value');
					var sgf_source = location.href.replace(/\/\w+\.htm$/,'') + '/' + src;
					data.sgf_source.push([md5(sgf_source), sgf_source, document.title || '']);
					data.level = 1;
					if(/zhongji/.test(src)) data.level = 2;
					if(/gaoji/.test(src)) data.level = 3;
					break;
				}
			}
		}else{		
			var trainings = document.querySelectorAll('td a');

			for(var i = 0; i < trainings.length; i++){
				var link = trainings[i].getAttribute('href');
				var m = link.match(/javascript\:newwindow2\(\'(.*)\'\)/);
				if(m){
					var sub = location.href.replace(/\/\w+\.htm$/,'') + '/' + m[1];
					data.sub.push(sub);
				}
			}
		}
		var json = require('object.h').stringify(data);
		alert(json);	
		__callback__(json); //call Spider.onparsed		
	});	
})();