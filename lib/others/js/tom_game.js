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

		var dlist = document.querySelectorAll('.courselist li.c a');

		for(var i = 0; i < dlist.length; i++){
			var sgf_source = dlist[i].getAttribute('href').replace(/^\.\.\/\.\./,'http://weiqi.sports.tom.com');
			var desc = dlist[i].parentNode.parentNode.querySelector('li.a a'); 
			desc = desc ? desc.innerHTML : '';
			data.sgf_source.push([md5(sgf_source), sgf_source, desc]);
		}
		if(dlist.length){
			var pages = document.querySelectorAll('.pagenum a');
			for(var i = 0; i < pages.length; i++){
				if(pages[i] && pages[i].innerHTML.trim() == "下一页"){
					var next = pages[i].getAttribute('href').replace(/^\//,'http://weiqi.sports.tom.com/');
					if(next != location.href){
						data.sub.push(next);
					}
				}
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);	
		__callback__(json); //call Spider.onparsed		
	});	
})();