(function(){

	var CustEvent = require('custevent');

	//页面解析类
	function PageParser(){
		CustEvent.createEvents(this, ['load']);
	}

	var parser = new PageParser();

	/* Async Usage:
		require("parser").on('load', function(evt){
			var title = document.querySelector('title').innerHTML;
			var subtitles = document.querySelectorAll('table h3');

			var data = {title: title, items:[]};

			for(var i = 0; i < subtitles.length; i++){
				data.items[i] = {subtitles : subtitles[i].innerText}
			}

			var json = require('object.h').stringify(data);

			__callback__(json); //call Spider.onparsed
		});
	*/

	exports = parser;

})();