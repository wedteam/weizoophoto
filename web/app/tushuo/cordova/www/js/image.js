(function(){
	var isElement = QW.ObjectH.isElement; 

	function encodeBase64(img){
		var canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;

		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);

		var dataURI = canvas.toDataURL('image/png');

		var m = dataURI.match(/^data:image\/(jpg|png);base64,(.*)/m);

		if(m){
			var data = {
				data: m[2],
				type: m[1]
			}
		}
		data.__defineGetter__('dataURL', function(){
			return "data:image/" + this.type + ";base64," + this.data;
		});
		canvas = null;
		return data;
	}

	var ImageLoader = {
		load : function(source, callback){
			if(!isElement(source)){
				var img = new Image();
				var me = this;
				img.onload = function(){
					if(callback.length)
						callback(encodeBase64(img));
					else
						callback();
					img = null;
				}
				img.src = source;
			}else{
				if(callback.length)
					callback(encodeBase64(source));
				else
					callback();
			}
		}
	}

	QW.provide('ImageLoader', ImageLoader);

})();