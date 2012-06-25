/*import from ../components/ajax/ajax.base.js,(by build.py)*/

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
}());/*import from ../components/ajax/ajax.pagelogic.js,(by build.py)*/

/*
 *	Copyright (c) 2010, QWrap.com All rights reserved.
 *	http://www.youa.com
 *	version: $version$ $release$ released
 *	author: quguangyu@baidu.com, akira.cn@gmail.com
 *  description: 前端控制页面逻辑的封装
*/

(function() {

/*CSRF*/
var QW = window.QW, 
	Ajax = QW.Ajax,
	mix = QW.ObjectH.mix, 
	keys = QW.ObjectH.keys,
	dump = QW.ObjectH.dump,
	stringify = QW.ObjectH.stringify,
	Dom = QW.Dom,
	W = QW.NodeW,
	g = Dom.g,
	NodeH = QW.NodeH,
	setHtml = NodeH.setHtml,
	addClass = NodeH.addClass,
	isElement = Dom.isElement,
	CustEvent = QW.CustEvent;

	/**
	 * 一个PageLogic是server向前端通过Ajax发送的一份json数据
	 * 这份数据包含前后端通讯的协议规则
	 * 具体规则如下：
		{
			err: <string status>, //状态，如果状态正常，服务器端返回 err:ok
			msg: <string postMsg | object msgData>, //服务器向客户端返回的消息
			data: <object responseData>, //服务器向客户端发回的包含业务数据的内容
			forward: <url | boolean>,  //服务器向客户端发送的跳转申请，会触发location动作
		}
		Ajax.PageLogic.request(url|form, callback=NULL);
		
		关于域和前缀的约定
			ssi.  表示通用
			user. 表示用户自定义
			<app>.  表示模块专用
			u_表示和用户相关的，s_表示和系统相关的
	 */
	
	/** 
	 * 配置一些默认的path
	 */
	if(typeof SiteUri == "undefined"){
		//通常在Server端配置后嵌入脚本中，如果没有的话，请自行配置
		SiteUri = {
			"404" : "/404.html",
			"50x" : "/50x.html"
		}; 
	}

	//默认状态执行的动作
	var ERR_EVENTS_DEFAULT = {
		/**
		 * 正常返回
		 * 默认动作：
		 * 如果有回调函数，执行回调函数
		 * 如果有data，将data传递给回调函数执行（默认逻辑，事件默认动作返回true，data被回调）
		 * 如果有msg,notify(msg)
		 * 如果有forward，跳转到forward指向的路径
		 */
		"ok": function(r){
			var url = r.forward;
			if(url){
				PageLogic.forward(url);
			}
			if(r.msg){
				PageLogic.notify(r.err, r.msg);
			}
			return true; //可正常执行页面的callback
		},
		/**
		 * 需要登录
		 * 如果有forward，跳转到forward指向的路径
		 */
		"ssi.u_login": function(r){
			if(r.forward === true) 
				r.forward = window.location.href;
			if(r.forward){
				PageLogic.forward(r.forward);
			}
		},
		/**
		 * 授权失败
		 * 用户没有权限请求此资源
		 * 默认动作：如果有forward，跳转到forward指向的路径
		 * 缺省将msg内容notify出来，如果也没有msg，那么就什么也不做
		 */
		"ssi.u_auth":  function(r){
			if(r.msg){
				PageLogic.notify(r.err, r.msg);
			}
			if(r.forward){
				PageLogic.forword(r.forward);
			}
		},
		/**
		 * 用户输入验证失败
		 * 用户提交的数据中有不合法的字段
		 * 默认动作：如果有forward，跳转到forward指向的路径
		 * 缺省将msg内容作为Valid的错误信息显示到表单中
		 */
		"usr.submit.valid": function(r){
			var errs = r.msg;
			if(r.forward){
				PageLogic.forword(r.forward);
			}
			else if(errs){
				if(typeof errs == "string"){
					PageLogic.notify(r.err,errs);
				}else{
					var focus = true;
					for(var err in errs){
						var el = document.getElementsByName(err)[0];
						if(el){
							Valid.fail(el, "对不起，输入格式不正确，请重新输入",focus);
							focus=false;
						}
					}
				}
			}
		},
		/**
		 * 用户请求的资源不存在
		 * 默认动作：如果有forward，跳转到forward指向的路径
		 * 缺省跳转到系统的404页面
		 */
		"ssi.u_404": function(r){
			var url = r.forward || SiteUri["404"];
			PageLogic.forward(url);
		},
		/**
		 * 用户被判定为作弊（未开放）
		 *
		"ssi.u_anitspam": function(){

		},*/
		/**
		 * 用户动作被禁止（未开放）
		 *
		"ssi.u_deny": function(){
		},*/
		/**
		 * 用户请求太频繁
		 * 缺省将msg内容notify出来
		 * 如果没有msg，什么也不做
		 */
		"ssi.u_ddos": function(r){
			if(r.msg){
				PageLogic.notify(r.err, r.msg);
			}			
		},
		
		/**
		 * 服务器返回
		 * 缺省打印出msg提示信息
		 * 如果没有msg，什么也不做
		 */
		"sys.default": function(r){
			if(r.msg){
				PageLogic.notify(r.err, r.msg);
			}					
		},
		
		/**
		 * 遇到致命错误
		 */
		"ssi.s_fatal": function(r){
			//TODO: 提供一个服务将致命信息交还给server
			if(r.msg) PageLogic.notify(r.err, r.msg, true);	//致命错误强制alert
			PageLogic.forword(SiteUri["50x"]);
		}
	};

	var PageLogic = {
		/**
			默认延迟0.5s后执行forward，因为动作中可能包括提示信息，延迟跳转可以让用户看到提示
		*/
		forwardDelay : 500,
		/**
			冷却时间
			过于频繁的请求有问题，所以这个参数决定了一个请求之后必须间隔多少毫秒才能再发起一个新的请求
		 */
		cooldown: 3000,
		/**
			冷却状态，如果为true，表示正在冷却
		 */
		_cooling: false,	
		/**
			对返回结果执行操作
		 */
		doAction : function(response, callback, opts) {
			opts = opts || {};
			if(!response) return false; //nothing to do

			if (typeof response == "string") {	//如果是json字符串，解析为对象
				try{
					var response = StringH.evalExp(response);
				}
				catch(e){
					response = {err:"sys.default", msg:"未知数据",data:response};
				}
			}
			var status = response.err || "sys.default";
			
			mix(response, opts, true);

			try{
				/**
				 * 系统已经定义的错误事件有默认动作，用户自定义的事件没有默认动作
				 */
				if(PageLogic.fire(status, response)){ // 如果没有被preventDefault，可以执行默认的动作
					var data = response.data;
					if(!ERR_EVENTS_DEFAULT[status] || ERR_EVENTS_DEFAULT[status](response)){
						if(callback) callback(data);	//如果有ERR_EVENTS_DEFAULT动作，那么当动作执行返回true的时候，才可以执行callback
					}
				}
			}catch(ex){
				if(typeof console != 'undefined'){
					console.log(ex);
				}
				PageLogic.doAction({err:"sys.default",msg:"未知错误"});
			}

		},
		forward : function(url,query){
			var delay = PageLogic.forwardDelay;
			if(query) url = url+"?"+query;
			if(url === true) {
				setTimeout("window.location = window.location.href;window.location.reload(true);", delay);
			} else {
				setTimeout("window.location='"+url+"'",delay);
			}
		},
		defineErrors: function(errors){	//增加用户自定义错误
			CustEvent.createEvents(PageLogic, keys(errors));
			for(var err in errors){
				ERR_EVENTS_DEFAULT[err] = errors[err];
			}
		},
		/**
		 * 显示通知信息，规则为，如果页面上包含id为"ssi_notify"的元素，那么在这个元素中显示，否则alert
		 * 第三个参数可以用来强制alert
		 */
		notify: function(err, msg, forceAlert){
		   /**
				允许支持一串err消息的列表
				这个通常是前端和server消息自己做映射规则用的
			*/
			if(typeof msg != "string"){
				if(msg[err])
					msg = msg[err];
				else  //nothing matched
					msg = stringify(msg);
			}
			if(!forceAlert){
				var el = g("ssi_notify");
				if(el){
					setHtml(el, msg);
					addClass(el, err.replace('ssi.', 'ssi-'));
				}else{
					alert(msg);
				}
			}else{
				alert(msg);
			}
		},
		request: function(oURL,callback,data,opts){
			if(PageLogic._cooling){
				//正在冷却，可以去监听这个事件来控制对这个方法的响应
				PageLogic.doAction({err:"ssi.u_ddos"});
				return;
			}
			
			var o = {
				method: 'post',
				cooldown: PageLogic.cooldown
			};

			mix(o, opts, true);
			
			if(o.cooldown > 0){
				PageLogic._cooling = true;
				setTimeout(function(){			//cooldown后才能继续请求
						PageLogic._cooling = false;
					}, o.cooldown
				);
			}
			
			Ajax[o.method](oURL, data, function(response){
				if(o.msg)
					PageLogic.doAction(response, callback, {msg:o.msg});
				else
					PageLogic.doAction(response, callback);
			}); //执行ajax请求
		}
	};

	CustEvent.createEvents(PageLogic, keys(ERR_EVENTS_DEFAULT));
	
	Ajax.PageLogic = PageLogic;
})();
/*import from ../components/ajax/ajax_retouch.js,(by build.py)*/

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