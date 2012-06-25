(function(){

	require("parser").on('load', function(evt){
		var title = document.querySelector('title').innerHTML;
		var subtitles = document.querySelectorAll('table h3');

		var nextPage = document.querySelector('a.n:nth-last-child(2)').getAttribute('href');


		var data = {title: title, items:[], next:nextPage};

		for(var i = 0; i < subtitles.length; i++){
			data.items[i] = {subtitles : subtitles[i].innerText}
		}

		var json = require('object.h').stringify(data);

		__callback__(json); //call Spider.onparsed
	});

})();