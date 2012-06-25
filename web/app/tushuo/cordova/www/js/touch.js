(function(){

var mix = QW.ObjectH.mix;

var _Hooks = {
	touchover : {
		touchstart : function(el, e){
			return true;
		}
	},
	touchleave : {
		touchstart : function(el, e){
			var point = e.touches[0] || e;
			startX = point.pageX;
			startY = point.pageY;
			el.__QW_touch_hovered = true;
			return false;
		},
		touchmove : function(el, e){
			if(el.__QW_touch_hovered){
				var point = e.touches[0] || e;
					deltaX = Math.abs(point.pageX - startX),
					deltaY = Math.abs(point.pageY - startY);

				if(deltaX > 36 || deltaY > 36){
					el.__QW_touch_hovered = false;
					return true;
				} 
			}
		},
		touchend : function(el, e){
			if(el.__QW_touch_hovered){
				el.__QW_touch_hovered = false;
				return true;
			}
		}
	}
}


mix(QW.EventTargetH._DelegateHooks, _Hooks);
mix(QW.EventTargetH._EventHooks, _Hooks);

})();