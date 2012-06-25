(function(){
	parser = require("parser");

	parser.on('load', function(){
		//更新描述
		var data = {
			sub:[], 
			up_desc:[]}; 

		var dlist = document.querySelectorAll('.courselist li.c a');

		for(var i = 0; i < dlist.length; i++){
			var sgf_source = dlist[i].getAttribute('href').replace(/^\.\.\/\.\./,'http://weiqi.sports.tom.com');
			var desc = dlist[i].parentNode.parentNode.querySelector('li.a a'); 
			desc = desc ? desc.innerHTML : '';
			data.up_desc.push([md5(sgf_source), desc]);
		}
		if(dlist.length){
			var pages = document.querySelectorAll('.pagenum a');
			for(var i = 0; i < pages.length; i++){
				if(pages[i] && pages[i].innerHTML.trim() == "下一页"){
					data.sub.push(pages[i].getAttribute('href').replace(/^\//,'http://weiqi.sports.tom.com/'));
				}
			}
		}

		var json = require('object.h').stringify(data);
		alert(json);	
		__callback__(json); //call Spider.onparsed		
	});	
})();