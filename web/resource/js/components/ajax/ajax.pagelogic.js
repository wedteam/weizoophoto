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
