(function() {
	var CustEvent = QW.CustEvent,
		mix = QW.ObjectH.mix;

	var Anim = function(action, dur, opts) {
		mix(this, opts);
		mix(this, {
			action: action,	//action，动画函数，
			dur: dur!=null?dur:400,	//动画时长
			_timeStamp: new Date()
		});
		CustEvent.createEvents(this, ANIM_EVENTS);
	};
	
	ANIM_EVENTS = ['beforestart','enterframe','pause','resume','end','reset'];

	function _cancel(anim){
		if(anim._requestID != null){
			window.cancelRequestAnimationFrame(anim._requestID);
			anim._requestID = null;
		}		
	}

	function _play(anim, begin, end, forceSync){
		if(anim._requestID == null){
			if(null == begin) begin = 0;
			if(null == end) end = 1;
			
			anim.per = begin;
			anim._timeStamp = new Date() - anim.per * anim.dur; //初始化tiemStamp

			var animate = function(time){
				if(anim.per >= end){
					_cancel(anim);
					anim.fire('end');
				}else{
					anim.per = Math.min(1.0, (time - anim._timeStamp) / anim.dur);
					if(anim.fire('enterframe') !== false){
						anim.action(anim.per);
					}
					anim._requestID = window.requestAnimationFrame(animate);
				}
			};
			
			//第一桢
			if(anim.fire('enterframe') !== false){
				anim.action(anim.per);
			}
			if(forceSync) animate(new Date()); //强制同步执行，只用在cancel/reset的时候
			else{
				anim._requestID = window.requestAnimationFrame(animate);
			}
		}
	}

	/**
		TODO: 考虑用状态机重写一版
	  	因为ios的animationFrame有可能是异步（或部分异步）框架，如果不维护状态的话，很可能冲突
	  	例如调了两次end之类的
	 **/
	mix(Anim.prototype, {
		start : function(){
			_cancel(this);
			this.fire('beforestart');
			_play(this);
			return true;
		},
		reset : function(){ //结束并回到初始状态
			_cancel(this);
			_play(this, 0, 0, true);
			this.fire('reset');
			return true;
		},
		pause : function(){
			if(this._requestID){
				_cancel(this);
				this.fire('pause');
				return true;
			}
			return false;
		},
		resume : function(){
			if(!this._requestID && this.per && this.per < 1){
				this.fire('resume');
				_play(this, this.per);
				return true;
			}
			return false;
		},
		cancel : function(){ //手工结束动画，会触发end事件
			this.resume();		//有可能被pause，所以要resume先
			if(this._requestID != null){
				_cancel(this);
				_play(this, 1,1,true);
				return true;
			}
			return false;
		}
	});

	QW.provide('Anim', Anim);
})();