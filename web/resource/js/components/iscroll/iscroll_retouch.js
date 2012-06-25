(function(){

	if (typeof QW !== 'undefined' && QW.provide){ 
		QW.provide('iScroll', iScroll);
	}

	var NodeW = QW.NodeW;

	NodeW.pluginHelper({
		scrollable : function(el, opts){
			this.__iScrollW = new iScroll(el, opts);
			return this.__iScrollW;
		}
	});
})();