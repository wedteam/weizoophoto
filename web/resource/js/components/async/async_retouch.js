(function() {
	var NodeW = QW.NodeW,
		AsyncH = QW.AsyncH,
		methodize = QW.HelperH.methodize,
		isFunction = QW.ObjectH.isFunction,
		mix = QW.ObjectH.mix;

	//异步方法
	NodeW.pluginHelper(AsyncH, 'operator');
	NodeW.pluginHelper({
		setTimeout : function(el, ims, fn){
			if(isFunction(ims)){ //ims和fn两个参数可以调换
				var tmp = fn;
				fn = ims;
				ims = tmp;
			}
			var id = setTimeout(function(){
				fn.call(el, id);
			}, ims);
		},
		setInterval: function(el, ims, fn){
			if(isFunction(ims)){ //ims和fn两个参数可以调换
				var tmp = fn;
				fn = ims;
				ims = tmp;
			}
			var id = setInterval(function(){
				fn.call(el, id);
			}, ims);
		}
	});

	//提供全局的Async对象
	var Async = {};
	mix(Async, methodize(AsyncH));

	QW.provide("Async", Async);
}());