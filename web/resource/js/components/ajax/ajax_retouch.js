(function(){

	var W = QW.NodeW,
		mix = QW.ObjectH.mix,
		g = QW.Dom.g;

	var FormH = {
		ajaxOnSubmit : function(oForm, callback, opts) {
			oForm=g(oForm);
			if( !oForm ) return;
				
			var o = {
				cooldown: 3000,
				validate: true
			};
			
			mix(o, opts, true);

			W(oForm).on('submit',function(e){
				e.preventDefault();
				//如果设置了需要验证，则进行表单验证
				if(o.validate && QW.Valid && !QW.Valid.checkAll(this))
					return;	

				if(Ajax.PageLogic){
					Ajax.PageLogic.request(this, callback, o);
				}else{
					Ajax.post(this, callback);
					W(this).attr('data--ban',o.cooldown);
				}
			});
		}
	};

	QW.NodeW.pluginHelper(FormH, 'operator');
})();