(function() {
	var els = document.getElementsByTagName('script');
	var srcPath = els[els.length - 1].src.replace(/[^\/]+$/, '');

	document.write('<script type="text/javascript" src="' + srcPath + 'touch.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'connection.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'storage.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'data.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'image.js"><\/script>');
    document.write('<script type="text/javascript" src="' + srcPath + 'setting.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'msgbox.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'weibo.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'main.js"><\/script>');
})();