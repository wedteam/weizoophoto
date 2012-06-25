/*import from ../components/animation/anim.frame.js,(by build.py)*/

/*
 *	http://qwrap.com
 *	version: $version$ $release$ released
 *	author: akira.cn@gmail.com
 */

/**
 * @helper AnimationTimingH 动画Helper
 * @namespace QW
 * @support http://www.w3.org/TR/animation-timing/
 */

(function(){

var mix = QW.ObjectH.mix,
	EventTargetH = QW.EventTargetH,
	forEach = Array.forEach || QW.ArrayH.forEach;

var requestAnimationFrame = window.requestAnimationFrame,
	cancelRequestAnimationFrame = window.cancelRequestAnimationFrame;

function getAnimationFrame(){
	if(requestAnimationFrame){
		return {
			request :requestAnimationFrame,
			cancel : cancelRequestAnimationFrame
		}
	} else if(window.msRequestAnimationFrame) {
		return {
			request :msRequestAnimationFrame,
			cancel : msCancelRequestAnimationFrame
		}
	} else if(window.mozCancelRequestAnimationFrame && window.mozRequestAnimationFrame) { 
		//firefox，11以下的版本没有实现cancelRequestAnimationFrame
		return {
			request :mozRequestAnimationFrame,
			cancel : mozCancelRequestAnimationFrame
		}
	} else if(window.webkitRequestAnimationFrame){
		return {
			request : function(callback){
				//修正某个诡异的webKit版本下没有time参数
				return window.webkitRequestAnimationFrame(
						function(){
							return callback(new Date());
						}
					);
			},
			cancel : window.webkitCancelRequestAnimationFrame
		}
	} else {
		return AnimationTimingManager;
	}
};


if(!(window.requestAnimationFrame || 
	 window.webkitRequestAnimationFrame ||
	 (window.mozCancelRequestAnimationFrame && window.mozRequestAnimationFrame) ||
	 window.msRequestAnimationFrame))
{
	var AnimationTimingManager = (function(){
		var millisec = 25;	 //40fps;
		var request_handlers = [];
		var id = 0, cursor = 0;

		function playAll(){
			var clone_request_handlers = request_handlers.slice(0);
			cursor += request_handlers.length;
			request_handlers.length = 0; //clear handlers;
			
			forEach(clone_request_handlers, function(o){
				if(o != "cancelled")
					return o(new Date());
			});
		}
		
		window.setInterval(playAll, millisec);

		return {
			request : function(handler){
				request_handlers.push(handler);
				return id++;
			},
			cancel : function(id){
				request_handlers[id-cursor] = "cancelled";
			}
		};
	
	})();
}

var AnimationTimingH = {
	/*long*/ requestAnimationFrame : function(/*window*/ owner, /*in FrameRequestCallback*/ callback){
		var raf = getAnimationFrame();
		return raf.request.call(owner, callback);
	},
	cancelRequestAnimationFrame : function(/*window*/ owner, /*in long*/ handle){
		var raf = getAnimationFrame();
		return raf.cancel.call(owner, handle);
	}
};

var ah = QW.HelperH.methodize(AnimationTimingH);
mix(window, ah);
})();/*import from ../components/animation/anim.base.js,(by build.py)*/

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
})();/*import from ../components/animation/anim.el.js,(by build.py)*/

(function() {	
	var Anim = QW.Anim,
		extend = QW.ClassH.extend,
		g = QW.NodeH.g,
		mix = QW.ObjectH.mix,
		isFunction = QW.ObjectH.isFunction,
		isString = QW.ObjectH.isString,
		isElement = QW.DomU.isElement,
		isPlainObject = QW.ObjectH.isPlainObject,
		isVisible = QW.NodeH.isVisible,
		setStyle = QW.NodeH.setStyle,
		getCurrentStyle = QW.NodeH.getCurrentStyle,
		getStyle = QW.NodeH.getStyle,
		removeStyle = QW.NodeH.removeStyle,
		map = Array.map || QW.ArrayH.map,
		show = QW.NodeH.show,
		hide = QW.NodeH.hide;
	
	function AnimAgent(el, opts, attr, anim){ //用来辅助对opts进行标准化操作的私有类
		this.el = el;
		this.attr = attr;
		this.anim = anim;
		
		//定义hook比直接设置值的办法更好，是因为hook可以延迟执行，到动画开始前才处理
		//因为动画可能是异步的
		if(isString(opts)){ //如果参数是字符串，匹配hooks
			if(opts in ElAnim.agentHooks){
				opts = ElAnim.agentHooks[opts](opts, attr, el, anim);
			}else{
				opts = ElAnim.agentHooks._default(opts, attr, el, anim);
			}
		}
		else if(isFunction(opts)){ //如果参数是function，那么是全局的hooks
			opts = opts(opts, attr, el, anim); //global hookers
		}
		else if(!isPlainObject(opts)){
			opts = {to: opts};
		}
		
		mix(this, opts);
		this.init();
	}

	mix(AnimAgent.prototype, {
		setValue : function(value){   //获得属性
			setStyle(this.el, this.attr, value);
		},
		getValue : function(){
			return getCurrentStyle(this.el, this.attr);
		},
		getUnit : function(attr){
			if(this.unit) return this.unit;
			
			var value = this.getValue();
			if(value)
				return value.toString().replace(/^[+-]?[\d\.]+/g,'');
			return '';
		},
		init : function(){ //初始化数据
			var from, to, by, unit;
			if(null != this.from){
				from = parseFloat(this.from);			
			}else{
				from = parseFloat(this.getValue()) || 0;
			}

			to = parseFloat(this.to);
			by = this.by != null ? parseFloat(this.by) : (to - from);	

			this.from = from;
			this.by = by;
			this.unit = this.getUnit();
		},
		action : function(per){
			var unit = this.unit;
			var value = this.from + this.easing(per , this.by);
			value = value.toFixed(6);
			this.setValue(value + unit);
		}
	});

	var RectAgent = extend(function(el, opts, attr){
		this.__overflow = getStyle(el, "overflow");
		setStyle(el, "overflow", "hidden");
		RectAgent.$super.apply(this, arguments);
	},AnimAgent);

	mix(RectAgent.prototype, {
		getUnit : function(attr){
			if(this.unit) return this.unit;
			
			var value = this.getValue();
			if(value)
				return value.toString().replace(/^[+-]?[\d\.]+/g,'');
			return 'px';
		},
		finished : function(){
			if(this.__overflow) setStyle(this.el, "overflow", this.__overflow);
		}
	}, true);

	var ScrollAgent = extend(
		function(){
			ScrollAgent.$super.apply(this, arguments);
	},AnimAgent);

	mix(ScrollAgent.prototype, {
		getValue : function() {
			return this.el[this.attr] | 0;
		},
		setValue : function(value) {
			this.el[this.attr] = Math.round(value);
		}
	}, true);

	var ColorAgent = extend(function(){
		ColorAgent.$super.apply(this,arguments);
	}, AnimAgent);

	mix(ColorAgent.prototype, {
		/**
		 * 处理颜色
		 * 
		 * @method parseColor
		 * @public
		 * @param {string} 颜色值，支持三种形式：#000/#000000/rgb(0,0,0)
		 * @return {array} 包含r、g、b的数组
		 */
		parseColor : function(s){
			/**
			 * ColorAnim用到的一些正则
			 * 
			 * @public
			 */
			var patterns = {
				rgb         : /^rgb\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\)$/i,
				hex         : /^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i,
				hex3        : /^#?([0-9A-F]{1})([0-9A-F]{1})([0-9A-F]{1})$/i
			};

			if (s.length == 3) { return s; }
			
			var c = patterns.hex.exec(s);
			
			if (c && c.length == 4) {
				return [ parseInt(c[1], 16), parseInt(c[2], 16), parseInt(c[3], 16) ];
			}
		
			c = patterns.rgb.exec(s);
			if (c && c.length == 4) {
				return [ parseInt(c[1], 10), parseInt(c[2], 10), parseInt(c[3], 10) ];
			}
		
			c = patterns.hex3.exec(s);
			if (c && c.length == 4) {
				return [ parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16) ];
			}
			
			return [0, 0, 0];
		},
		/**
		 * 初始化数据
		 * 
		 * @method initData
		 * @public
		 * @return void
		 */
		init : function(){
			var from, to, by, unit;
			var parseColor = this.parseColor;

			if(null != this.from){
				from = this.from;			
			}else{
				from = this.getValue();
			}

			from = parseColor(from);

			to = this.to || [0,0,0];
			to = parseColor(to);

			by = this.by ? parseColor(this.by) : 
				map(to, function(d,i){
					return d - from[i];
				});

			this.from = from;
			this.to = to;
			this.by = by;
			this.unit = ''; //this.getUnit();
		},

		/**
		 * 获取CSS颜色
		 * 
		 * @method setAttr
		 * @public
		 * @param {string} 属性名
		 * @return {string} 颜色值
		 */
		getValue : function() {
			var color = getCurrentStyle(this.el, this.attr);
			return this.parseColor(color);
		},

		/**
		 * 设置CSS颜色
		 * 
		 * @method setAttr
		 * @public
		 * @param {string} 属性名
		 * @param {string} 值
		 * @return void
		 */
		setValue : function(value) {
			if(typeof value == "string") {
				setStyle(this.el, this.attr, value);
			} else {
				setStyle(this.el, this.attr, "rgb("+value.join(",")+")");
			}
		},
		action : function(per){
			var me = this;
			var value = this.from.map(function(s, i){
				return Math.max(Math.floor(s + me.easing(per, me.by[i])),0);
			});
			this.setValue(value);
		}
	}, true);

	/*
	 * 相关的数据处理器，返回处理器
	 */
	var _agentPattern = { 
		"color$" : ColorAgent, 
		"^scroll" : ScrollAgent,
		"width$|height$|top$|bottom$|left$|right$" : RectAgent,
		"easing" : null,  //这些属性没有agent
		".*" : AnimAgent
	};

	function _patternFilter(patternTable, key){
		for(var i in patternTable){
			var pattern = new RegExp(i, "i");
			if(pattern.test(key)){
				return patternTable[i];
			}
		}	
		return null;
	};
	
	var ElAnim = extend(
		function(el, opts, dur, easing){
			el = g(el);

			if(!isElement(el)) 
				throw new Error(['Animation','Initialize Error','Element Not Found!']);

			easing = easing || function(p, d) {return d * p};		

			this.options = opts;
			var agents = [];

			var action = function(per){
				for(var i = 0; i < agents.length; i++){
					agents[i].action(per);		
				}
			}
			
			this.agents = agents;

			ElAnim.$super.call(this, action, dur);
			
			//放在开始动画的时候才初始化Agent是因为动画可能是异步的（比如等待上一个动画结束）
			//如果立即初始化Agent，那么之后播放的时候，元素里面的属性变化了就捕获不到
			this.on("beforestart",function(evt){
				for(var attr in opts){
					var Agent = _patternFilter(_agentPattern, attr);
					agent = new Agent(el, opts[attr], attr, evt.target);
					agent.easing = agent.easing || easing;
					agents.push(agent);
				}
			}); 

			this.on("end", function(evt){
				for(var i = 0; i < agents.length; i++){
					var agent = agents[i];
					if(agent && agent.finished){
						agent.finished();
					}
				}			
			});
		},Anim);
	
	/**
	 * 用来预处理agent属性的hooker
	 */
	ElAnim.agentHooks = {
		//如果是show动画，那么show之后属性从0变到当前值
		show: function(opts, attr, el, anim){
			show(el);
			return {from:0, to:getCurrentStyle(el, attr)}
		},
		//如果是hide动画，那么属性从当前值变到0之后，还原成当前值并将元素hide
		hide: function(opts, attr, el, anim){
			var value = getCurrentStyle(el, attr);
			anim.on("end", function(){	//如果是hide，动画结束后将属性值还原，只把display设置为none
				setStyle(el, attr, value);
				hide(el);
			});	
			return {from: value, to: 0}
		},
		//如果是toggle动画，那么根据el是否可见判断执行show还是hide
		toggle: function(opts, attr, el, anim){
			if(!isVisible(el)){
				return ElAnim.agentHooks.show.apply(this, arguments);
			}else{
				return ElAnim.agentHooks.hide.apply(this, arguments);
			}	
		},
		//默认解析字符串空格分开
		_default: function(opts, attr, el, anim){
			var parts = opts.split(/\s+/g);
			if(parts.length >= 2){
				return {from: parts[0], to: parts[1]}; 
			}else{
				return {to: parts[0]};
			}
		}
	};

	QW.provide("ElAnim", ElAnim);
})();/*import from ../components/animation/anim.easing.js,(by build.py)*/

/*
 *	Copyright (c) 2009, Baidu Inc. All rights reserved.
 *	http://www.youa.com
 *	version: $version$ $release$ released
 *	author: quguangyu@baidu.com
*/

 (function() {
	var Easing  = {
		
		easeNone: function(p,d) {
			return d*p;
		},
		easeIn: function(p,d) {
			return d*p*p;
		},
		easeOut: function(p,d) {
			return -d*p*(p-2);
		},
		easeBoth: function(p,d) {
			if((p/=0.5)<1)return d/2*p*p;
			return -d/2*((--p)*(p-2)-1);
		},
		easeInStrong: function(p,d) {
			return d*p*p*p*p;
		},
		easeOutStrong: function(p,d) {
			return -d*((p-=1)*p*p*p-1);
		},
		easeBothStrong: function(p,d) {
			if((p/=0.5)<1)return d/2*p*p*p*p;
			return -d/2*((p-=2)*p*p*p-2);
		},
		elasticIn: function(p,d) {
			if(p==0)return 0;
			if(p==1)return d;
			var x=d*.3,y=d,z=x/4;
			return -(y*Math.pow(2,10*(p-=1))*Math.sin((p*d-z)*(2*Math.PI)/x));
		},
		elasticOut: function(p,d) {
			if(p==0)return 0;
			if(p==1)return d;
			var x=d*.3,y=d,z=x/4;
			return y*Math.pow(2,-10*p)*Math.sin((p*d-z)*(2*Math.PI)/x)+d;
		},
		elasticBoth: function(p,d) {
			if(p==0)return 0;
			if ((p/=0.5)==2)return d;
			var x=.3*1.5,y=d,z=x/4;
			if(p<1)return -.5*(y*Math.pow(2,10*(p-=1))*Math.sin((p-z)*(2*Math.PI)/x));
			return y*Math.pow(2,-10*(p-=1))*Math.sin((p-z)*(2*Math.PI)/x )*.5+d;
		},
		backIn: function(p,d) {
			var s=1.70158;
			return d*p*p*((s+1)*p-s);
		},
		backOut: function(p,d) {
			var s=1.70158;
			return d*((p=p-1)*p*((s+1)*p+s)+1);
		},
		backBoth: function(p,d) {
			var s=1.70158;
			if((p/=0.5)<1)return d/2*(p*p*(((s*=(1.525))+1)*p-s));
			return d/2*((p-=2)*p*(((s*=(1.525))+1)*p+s)+2);
		},
		bounceIn: function(p,d) {
			return d-Easing.bounceOut(1-p,d);
		},
		bounceOut: function(p,d) {
			if(p<(1/2.75)) {
				return d*(7.5625*p*p);
			}else if(p<(2/2.75)) {
				return d*(7.5625*(p-=(1.5/2.75))*p + .75);
			}else if(p<(2.5/2.75)) {
				return d*(7.5625*(p-=(2.25/2.75))*p + .9375);
			}
			return d*(7.5625*(p-=(2.625/2.75))*p + .984375);
		},
		bounceBoth: function(p,d) {
			if(p<0.5)return Anim.Easing.bounceIn(p*2,d)*.5;
			return Easing.bounceOut(p*2-1,d)*.5 + d*.5;
		}
	};

	QW.ElAnim.Easing = Easing;
 })();/*import from ../components/animation/anim_retouch.js,(by build.py)*/

(function() {
	var QW = window.QW, 
		mix = QW.ObjectH.mix,
		isArray = QW.ObjectH.isArray,
		HH = QW.HelperH, 
		W = QW.NodeW,
		Dom = QW.Dom,
		Anim = QW.ElAnim;

	var AnimElH = (function(){
		return {
			fadeIn : function(el, dur, complete, easing) {
				var params = {
					"opacity" : "show"
				};
				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};
				return AnimElH.animate(el, params, options);
			},
			fadeOut : function(el, dur, complete, easing) {
				var params = {
					"opacity" : "hide"
				};
				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};

				return AnimElH.animate(el, params, options);
			},
			fadeToggle : function(el, dur, complete, easing) {
				var params = {
					"opacity" : "toggle"
				};
				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};

				return AnimElH.animate(el, params, options);
			},
			/* 淡入/淡出切换 */
			/*fadeToggle: function(el, dur, complete) {
				AnimElH[el.offsetHeight ? 'fadeOut' : 'fadeIn'](el, dur, complete);
			},*/
			slideUp : function(el, dur, complete, easing) {
				var params = {
					"height" : "hide"
				};

				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};

				return AnimElH.animate(el, params, options);
			},
			slideDown : function(el, dur, complete, easing) {
				
				var params = {
					"height" : "show"
				};

				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};

				return AnimElH.animate(el, params, options);
			},
			slideToggle : function(el, dur, complete, easing) {
				
				var params = {
					"height" : "toggle"
				};

				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing
				};

				return AnimElH.animate(el, params, options);
			},
			/*slideToggle: function(el, dur, complete) {
				AnimElH[el.offsetHeight ? 'slideUp' : 'slideDown'](el, dur, complete);
			},*/
			shine4Error : function(el, dur, complete, easing) {			
				
				var params = {
					"backgroundColor" : {
						from : "#f33",
						to	 : "#fff"
					}				
				};
				
				var options = {
					duration : dur,
					complete : complete,
					easing	 : easing				
				};

				var anim = AnimElH.animate(el, params, options);

				anim.on("end", function(){
					W(el).setStyle("backgroundColor", "");
				});

				return anim;
			},
			/**
			 * Animate a HTML element or SVG element wrapper
			 * @param {Object} el
			 * @param {Object} params
			 * @param {Object} options jQuery-like animation options: duration, easing, step, complete
			 */
			animate : function (el, params, options) {
				options = options || {};

				var dur = options.duration;
				var easing = options.easing;
				var complete = options.complete;
				var step = options.step;
				var anim = new Anim(el, params, dur, easing);
				var sequence = options.sequence != null ? options.sequence : AnimElH.sequence;

				if(complete) anim.on("end", complete); //执行oncomplete

				if(step) anim.on("enterframe", step);

				el.__QWELANIMH_animations = el.__QWELANIMH_animations || [];
				el.__QWELANIMH_animations.push(anim); //动画进入队列
				anim.on('end', function(){
					el.__QWELANIMH_animations.shift(); //动画执行完成之后移出队列
				});

				function animate(){
					AnimElH.clearAnimate(el);	//如果已经在执行动画，先取消
					var anim = el.__QWELANIMH_animations[0];
					anim.start(); //队列中的动画依次执行
					if(anim.skip) anim.cancel();
				}
				if(QW.Async && sequence){	//如果支持异步序列执行，wait
					W(el).wait("_animate", function(){
						setTimeout(animate);
					});
					anim.on("end", function(){
						W(el).signal("_animate");			//发送一个signal告诉NodeW动画结束
					});
				}else{							//否则立即执行
					setTimeout(animate);
				}

				return anim;
			},
			clearAnimate : function(el){
				if(el.__QWELANIMH_animations && el.__QWELANIMH_animations[0]){
					el.__QWELANIMH_animations[0].cancel();
				}
			},
			animator: function(el){
				if(el.__QWELANIMH_animations && el.__QWELANIMH_animations[0]){
					return el.__QWELANIMH_animations[0];
				}
				return null;				
			}
		};
	})();

	if(QW.Async){
		mix(AnimElH,{
			sequence : true,
			/**
			 * Do noting but wait
			 */
			sleep: function(el, dur, complete){

				var options = {
					duration : dur,
					complete : complete
				};

				return AnimElH.animate(el, {}, options);
			},
			clearAllAnimate: function(el){
				if(el.__QWELANIMH_animations && el.__QWELANIMH_animations.length){
					el.__QWELANIMH_animations[0].cancel();
					for(var i = 0; i < el.__QWELANIMH_animations.length; i++){
						el.__QWELANIMH_animations[i].skip = true;	
					}
				}
			}
		});
	}

	QW.NodeW.pluginHelper(AnimElH, {animator: 'getter_first', '*': 'operator'});
	if (QW.Dom) {
		mix(QW.Dom, AnimElH);
	}

	QW.provide("AnimElH", AnimElH); 
})();