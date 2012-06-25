/*
 * 支持 GET/POST/PUT/DELETE/COPY 的 Ajax 增强版
 * 并且规范了几种Content-Type行为
 * 当 RequestHeader 中的 Content-Type 为 application/x-json 的时候，接受json格式的data (GET方法除外，因为不支持)
 * 当 RequestHeader 中的 Content-Type 为 application/x-jsonp 的时候，发起jsonp的请求
 * 当 ResponseHeader 中的 Content-Type 为 application/x-json 的时候，getResponseBody时解析json
 * 当 ResponseHeader 中的 Content-Type 为 application/x-javascript 的时候， getResponseBody时解析javascript
 * 当 ResponseHeader 中的 Content-Type 为 text/xml时，getResponseBody时返回responseXML
 * 
 * @fileoverview Encapsulates common operations of Ajax
 * @author　JK、Akira,绝大部分代码来自BBLib/util/BBAjax(1.0版),其作者为：Miller。致谢
 * @version 0.1
 * @create-date : 2009-02-20
 * @last-modified : 2011-10-10
 */


(function() {
	var mix = QW.ObjectH.mix,
		isPlainObject = QW.ObjectH.isPlainObject,
		encodeURIJson = QW.ObjectH.encodeURIJson,
		decodeURIJson = QW.StringH.queryUrl,
		evalExp = QW.StringH.evalExp,
		evalJs = QW.StringH.evalJs,
		encodeURIForm = QW.NodeH.encodeURIForm,
		stringify = (typeof JSON!= 'undefined') && JSON.stringify ? JSON.stringify : QW.ObjectH.stringify,
		CustEvent = QW.CustEvent,
		HelperH = QW.HelperH,
		AsyncH = QW.AsyncH;

	var _jsonp_id = 0;
	
	/**
	* @class Ajax Ajax类的构造函数
	* @param {json} options 构造参数
		*----------------------------------------------------------------------------------------
		*| options属性		|		说明					|	默认值							|
		*----------------------------------------------------------------------------------------
		*| url: 			|	请求的路径					|	空字符串						|
		*| method: 			|	请求的方法					|	get								|
		*| async: 			|	是否异步请求				|	true							|
		*| user:			|	用户名						|	空字符串						|
		*| pwd:				|	密码						|	空字符串						|
		*| headers:			|	请求头属性					|	{}								|
		*| charset:			|	默认编码					|	UTF-8							|
		*| data:			|	发送的数据					|	空字符串						|
		*| timeout:			|	设置请求超时的时间（ms）	|	30000							|
		*| jsonp:			|	jsonp的参数名				|	cb								|	
		*| sequence:		|	顺序加载，前一个请求结束再进行下一个请求						|
		*| onsucceed:		|	请求成功监控 (成功指：200-300以及304)							|
		*| onerror:			|	请求失败监控													|
		*| oncancel:		|	请求取消监控													|
		*| oncomplete:		|	请求结束监控 (success与error都算complete)						|
		*----------------------------------------------------------------------------------------
	* @return {Ajax} 
	*/
	
	/**
	 * 支持Ajax({sequence:true}).get(...).get(...).post(...).getJSONP(...)...
	 */
	var Ajax = (function(){
		var _options = {};

		return function (options) {
			if(this.constructor == arguments.callee){ //判断是new操作符还是函数调用
				mix(options, _options);
				this.options = options;
				this._initialize();
				if(QW.Async && this.sequence){
					this.on('complete', function(){
						this.signal('_ajax');
					});
				}
			}else{
				_options = options;
			}
		}
	})();
	
	/**
	 * 让Ajax支持Async
	 * Ajax.get(url, data, callback).wait(function(){	
	 *		Ajax.get(...);
	 * });
	 *
	 * Ajax.get(url, data, callback, {sequence:true})
	 *	   .get(...);
	 */
	mix(Ajax.prototype, HelperH.methodize(AsyncH));

	mix(Ajax, {
		/*
		 * 请求状态
		 */
		STATE_INIT: 0,
		STATE_REQUEST: 1,
		STATE_SUCCESS: 2,
		STATE_ERROR: 3,
		STATE_ABORT: 4,
		STATE_COMPLETE: 5,
		/** 
		 * defaultHeaders: 默认的requestHeader信息
		 */
		defaultHeaders: {
			'Content-type': 'application/x-www-form-urlencoded', //最常用配置
			'com-info-1': 'QW', //根具体应用有关的header信息
			'X-Requested-With':'XMLHttpRequest'
		},
		/** 
		 * EVENTS: Ajax的CustEvents：'succeed','error','abort','complete'
		 */
		EVENTS: ['succeed', 'error', 'abort', 'complete'],
		/**
		 *XHRVersions: IE下XMLHttpRequest的版本
		 */
		XHRVersions: ['MSXML2.XMLHttp.6.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'Msxml2.XMLHTTP', 'MSXML.XMLHttp', 'Microsoft.XMLHTTP'],
		/* 
		 * getXHR(): 得到一个XMLHttpRequest对象
		 * @returns {XMLHttpRequest} : 返回一个XMLHttpRequest对象。
		 */
		getXHR: function() {
			var versions = Ajax.XHRVersions;
			if (window.ActiveXObject) {
				while (versions.length > 0) {
					try {
						return new ActiveXObject(versions[0]);
					} catch (ex) {
						versions.shift();
					}
				}
			} 
			if (window.XMLHttpRequest) {
				return new XMLHttpRequest();
			}
			return null;
		},
		/**
		 * 静态request方法
		 * @method request
		 * @static
		 * @param {String} method (Optional) 请求方式，get/post/put/copy/delete
		 * @param {String|Form} url 请求的地址。（也可以是Json，当为Json时，则只有此参数有效，会当作Ajax的构造参数）。
		 * @param {String|Array|Json|Form} data (Optional)发送的数据，如果data是数组，那么按[headers, body]格式
		 * @param {Function} callback 请求完成后的回调
		 * @param {Json} options Ajax选项
		 * @returns {Ajax}
		 * @example 
			QW.Ajax.request('get','http://demo.com',{key: 'value'},function(data){});
		 */
		request: function(method, url, data, callback, options) {
			if (isPlainObject(method)) {
				var a = new Ajax(method);
			} 
			else {
				var headers = {};

				if (typeof data == 'function') {
					options = callback;
					callback = data;
					data = '';
				}
				if (data instanceof Array)
				{
					headers = data[0];
					data = data[1];
				}
				if (url && url.tagName && url.tagName.toUpperCase() == 'FORM') {
					method = method || url.method;
					data = url;
					url = url.action;
				}
				a = new Ajax(mix({
					url: url,
					method: method,
					headers: headers,
					data: data,
					oncomplete: function(evt){
						callback(evt.response.body);
					}
				},options,true));
			}
			if(QW.Async && a.sequence){	//如果支持异步序列，wait
				a.wait("_ajax", function(){
					a.request();
				});
			}else{
				a.request();
			}
			return a;
		},
		/**
		 * 静态get方法
		 * @method get
		 * @static
		 * @param {String|Form} url 请求的地址
		 * @param {String|Json|Form} data (Optional)发送的数据
		 * @param {Function} callback 请求完成后的回调
		 * @param {Json} options Ajax选项
		 * @returns {Ajax}
		 * @example
			QW.Ajax.get('http://demo.com',{key: 'value'},function(e){alert(this._xhr.responseText);});
		 */
		get: function(url, data, callback, options) {
			return Ajax.request('get', url, data, callback, options);
		},
		/**
		 * 静态post方法
		 * @method post
		 * @static
		 * @param {String|Form} url 请求的地址
		 * @param {String|Json|Form} data (Optional)发送的数据
		 * @param {Function} callback 请求完成后的回调
		 * @param {Json} options Ajax选项
		 * @returns {Ajax}
		 * @example
			QW.Ajax.post('http://demo.com',{key: 'value'},function(e){alert(this._xhr.responseText);});
		 */
		post: function(url, data, callback, options) {
			return Ajax.request('post', url, data, callback, options);
		},
		/**
		 * 静态JSONP方法
		 * @method
		 * @static
		 * @param {String} url 请求的地址
		 * @param {Object|String} data 发送的数据
		 * @param {Function} callback 请求成功后的回调
		 * @param {Json} options Ajax选项
		 */
		getJSONP: function( url, data, callback, options){
			return Ajax.request('get', url, [{'Content-type': 'application/x-jsonp'},data], callback, options);
		}		
	});

	mix(Ajax.prototype, {
		//参数
		url: '',
		method: 'get',
		async: true,
		user: '',
		pwd: '',
		headers: {}, //是一个json对象
		data: '',
		charset : 'UTF-8',
		timeout: 30000, //超时时间
		jsonp: 'cb',
		sequence: true, //默认按照顺序请求，一个请求结束后在执行下一个请求

		//私有变量｜readOnly变量
		state: Ajax.STATE_INIT, //还未开始请求
		_jsonp_id: 0,
		setRequestHeader: function(key, value){
			if(isPlainObject(key)){
				mix(this.headers, key, true);
			}else{
				this.headers[key] = value;
			}
		},
		/** 
		 * request( method, url, data ): 发送请求
		 * @param {string} url 请求的url
		 * @param {string} method 传送方法，get/post/put/delete/copy
		 * @param {string|jason|FormElement} data 可以是字符串，也可以是Json对象，也可以是FormElement
		 * @returns {void} 
		 */
		request: function(method, url, data) {
			var me = this;
			
			//发起新的请求之前结束旧的请求
			if (me.isProcessing()) {
				me.cancel();
			}
			
			url = url || me.url;
			method = (method || me.method || 'get').toLowerCase();
			data = data || me.data;
			
			if (data && typeof data == 'object') {
				if (data.tagName && data.tagName.toUpperCase() == 'FORM'){
					data = encodeURIForm(data); //data是Form HTMLElement
				}else{
					data = encodeURIJson(data); //data是Json数据
				}
			}

			contentType = this.headers['Content-type'];

			//如果是get方式请求，则传入的数据必须是'key1=value1&key2=value2'格式的。
			if (method == 'get') {
				if(data){
					url += (url.indexOf('?') != -1 ? '&' : '?') + data;
					data = null;
				}

				if(/(^|\/)(x-)?(jsonp)([\/;]|$)/i.test(contentType)){
					//跨域jsonp或javascript请求
					var jsonp = 'jsonp' + _jsonp_id++, jsonpstr = me.jsonp + '=' + jsonp;
					url = url.indexOf('?') != -1 ? url + '&' + jsonpstr : url + '?' + jsonpstr;
					me._getJSONP(url,jsonp);
					return;					
				}
			}
			else if(method == 'copy'){		//如果是Copy
				me.setRequestHeader('Destination', data);
			}
			else{		//支持JSON格式
				//application/json etc. 
				if(/(^|\/)(x-)?json([\/;]|$)/i.test(contentType)){
					data = stringify(decodeURIJson(data));
				}		
			}
			
			var xhr = me._xhr;

			if (!xhr) {
				xhr = me._xhr = Ajax.getXHR();
				if (!xhr) {
					throw new Error('Fail to get HTTPRequester.');
				}
			}

			if (me.user) 
				xhr.open(method, url, me.async, me.user, me.pwd);
			else 
				xhr.open(method, url, me.async);

			//send headers
			for (var i in me.headers) {
				var content = me.headers[i];
				if (/^content-type$/i.test(i) && content.indexOf('charset') < 0){
					content += ';charset=' + me.charset;
				}
				xhr.setRequestHeader(i, content);
			}

			me.state = Ajax.STATE_REQUEST;

			//send事件
			if (me.async) {
				me._sendTime = new Date();
				me._xhr.onreadystatechange = function() {
					var state = me._xhr.readyState;
					if (state == 4 && me.state != Ajax.STATE_ABORT) {
						me._execComplete();
					}
				};
				me._checkTimeout();
			}

			xhr.send(data);
			
			if (!me.async) {
				me._execComplete();
			}

		},
		/** 
		 * isSuccess(): 判断现在的状态是否是“已请求成功”
		 * @returns {boolean} : 返回XMLHttpRequest是否成功请求。
		 */
		isSuccess: function() {
			var status = this._xhr.status;
			return !status || (status >= 200 && status < 300) || status == 304;
		},
		/** 
		 * isProcessing(): 判断现在的状态是否是“正在请求中”
		 * @returns {boolean} : 返回XMLHttpRequest是否正在请求。
		 */
		isProcessing: function() {
			var state = this._xhr ? this._xhr.readyState : 0;
			return state > 0 && state < 4;
		},
		/** 
		 * get(url,data): 用get方式发送请求
		 * @param {string} url: 请求的url
		 * @param {string|jason|FormElement} data: 可以是字符串，也可以是Json对象，也可以是FormElement
		 * @returns {void} : 。
		 * @see : request 。
		 */
		get: function(url, data) {
			this.request(url, 'get', data);
		},
		/** 
		 * get(url,data): 用post方式发送请求
		 * @param {string} url: 请求的url
		 * @param {string|jason|FormElement} data: 可以是字符串，也可以是Json对象，也可以是FormElement
		 * @returns {void} : 。
		 * @see : request 。
		 */
		post: function(url, data) {
			this.request(url, 'post', data);
		},
		/** 
		 * cancel(): 取消请求
		 * @returns {boolean}: 是否有取消动作发生（因为有时请求已经发出，或请求已经成功）
		 */
		cancel: function(reason) {
			if (this._xhr && this.isProcessing()) {
				this.state = Ajax.STATE_ABORT;
				this._xhr.abort();  //Firefox、webKit执行该方法后会触发onreadystatechange事件，并且state=4;所以会触发oncomplete事件。而IE、Safari不会
				this._execComplete({error:'u_abort', reason:reason || ''});
				return true;
			}
			return false;
		},
		/**
		 * 获得返回的ResponseBody
		 * @param contentType {String} 返回的MIMETYPE类型，缺省从responseHeader中取
		 */
		getResponseBody : function(contentType){
			if(this.state == Ajax.STATE_SUCCESS || this.state == Ajax.STATE_ERROR){
				var xhr = this._xhr;

				if(xhr){
					contentType = contentType || xhr.getResponseHeader("content-type") || 'text/plain';

					if(/(^|\/)xml([\/;]|$)/i.test(contentType)){	//如果content-type为包含xml的类型
						return xhr.responseXML;
					}
					
					if(/(^|\/)(x-)?json([\/;]|$)/i.test(contentType)){
						return evalExp(xhr.responseText);
					}

					if(/(^|\/)(x-)?(jsonp|javascript)([\/;]|$)/i.test(contentType)){
						return evalJs(xhr.responseText);
					}

					return xhr.responseText;			
				}
			}

			return null;
		},
		/** 
		 * _initialize(): 对一个Ajax进行初始化
		 * @returns {void}: 
		 */
		_initialize: function() {
			CustEvent.createEvents(this, Ajax.EVENTS);
			mix(this, this.options, true);
			this.headers = mix(this.headers, Ajax.defaultHeaders);
		},
		/** 
		 * _checkTimeout(): 监控是否请求超时
		 * @returns {void}: 
		 */
		_checkTimeout: function() {
			var me = this;
			if (me.async) {
				clearTimeout(me._timer);
				me._timer = setTimeout(function() {
					// Check to see if the request is still happening
					me.cancel('timeout');
				}, me.timeout);
			}
		},
		/** 
		 * _execComplete(): 执行请求完成的操作
		 * @returns {void}: 
		 */
		_execComplete: function(responseData) {
			if(this.state == Ajax.STATE_COMPLETE)
				return;
			
			clearTimeout(this._timer);

			if (this.state == Ajax.STATE_REQUEST){
				var xhr = this._xhr;
				xhr.onreadystatechange = new Function; //防止IE6下的内存泄漏
				if (this.isSuccess()) {
					this.state = Ajax.STATE_SUCCESS;
				} else {
					this.state = Ajax.STATE_ERROR;
				}
			}

			response = {
				body: responseData || this.getResponseBody()
			};

			if (this.state == Ajax.STATE_ABORT) {
				//do nothing. 如果是被取消掉的则不执行回调
				if(this.fire('abort', {response:response}) !== false){ //不取消默认动作，则抛出异常
					throw new Error('Response Error ' + response.body.reason);
				}
			} else if(this.state == Ajax.STATE_SUCCESS){
				this.fire('succeed', {response:response});
			} else if(this.state == Ajax.STATE_ERROR){
				if(this.fire('error', {response:response}) !== false){  //不取消默认动作，则抛出异常
					throw new Error('Response Error '+this._xhr.status);
				}
			}
			this.fire('complete', {response:response});
			this.state = Ajax.STATE_COMPLETE;
		},
		_getJSONP: function(url,jsonp){
			var me = this;
			var head = document.getElementsByTagName("head")[0] || document.documentElement;
			//超时设置
			if( me.timeout > 0 ){
				clearTimeout(me._timer);
				me._timer = setTimeout(function(){
				   me.state = Ajax.STATE_ABORT;
				   me._execComplete({error:'u_abort',reason:'timeout'});
				}
				,me.timeout);
			}
			var script = document.createElement('script');
			if( me.charset )
				script.charset = me.charset;
			window[jsonp] = function (data) {
				if( me._timer )
					clearTimeout(me._timer);
				/*调用用户传入的callback*/		
				me.state = Ajax.STATE_SUCCESS;
				me._execComplete(data);
				// Garbage collect
				window[ jsonp ] = undefined;

				try {
					delete window[ jsonp ];
				} catch(e) {}

				if ( head ) {
					head.removeChild( script );
				}
			};
			script.src = url;
			head.appendChild(script);
		}
	});

	QW.provide('Ajax', Ajax);
}());