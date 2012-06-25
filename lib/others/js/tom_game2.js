(function(){
	parser = require("parser");

	parser.on('load', function(){
		var data = {
			sub:[], 
			referer: location.href,
			site: location.hostname, 
			sgf_source:[], 
			type:sgf_type || 10, 
			level : sgf_level || 4}; //pro-game

		var dlist = document.querySelectorAll('.courselist ul');

		if(dlist.length > 1){

			for(var i = 0; i < dlist.length; i++){
				var ul = dlist[i];
				if(ul.querySelector('.c') == null){
					var game = ul.querySelector('.a a');
					if(game){
						var link = game.getAttribute('href');
						var m = link.match(/javascript\:newwindow\(\'(.*)\'\)/);
						if(m){
							var sub = m[1];
							data.sub.push(sub);
						}					
					}
				}
			}

			var pages = document.querySelectorAll('.pagenum a');
			for(var i = 0; i < pages.length; i++){
				if(pages[i] && pages[i].innerHTML.trim() == "下一页"){
					var next = pages[i].getAttribute('href').replace(/^\//,'http://weiqi.sports.tom.com/');
					if(next != location.href){
						data.sub.push(next);
					}
				}
			}
		}else{
			var scripts = document.querySelectorAll('script');
			for(var i = 0; i < scripts.length; i++){
				var text = scripts[i].innerHTML;
				if(text){
					m = text.match(/<param name=filename\s+value=(?:\.\.\/)*(.*?)\s*>/m);

					if(m){
						sgf_source = "http://" + location.hostname + '/' + m[1];
						data.sgf_source.push([md5(sgf_source), sgf_source, document.title || '']);
					}
				}
			}			
		}

		var json = require('object.h').stringify(data);
		alert(json);	
		__callback__(json); //call Spider.onparsed		
	});	
})();