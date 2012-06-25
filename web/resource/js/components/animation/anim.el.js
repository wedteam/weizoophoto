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
})();