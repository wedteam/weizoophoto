var WEIBO = (function(){
	var weibo = {};
	var server_url = 'http://m.weizoo.com';
	var server_path = {
			bind : '/t/bind',
			send : '/t/send'
		};

	weibo.token = {
		set : function(data, site){
			QW.Setting.set('tushuo.weibo.' + site, data);
		},
		get : function(site){
			return QW.Setting.get('tushuo.weibo.' + site);
		}
	},
	
	weibo.bind = function(site){
		if(!QW.Connection.online){
			msgbox('未连接到网络', 'error');
			W("#bind-weibo span > span").replaceClass('on', 'off');
			return;
		}
		msgbox('请稍等...', 'wait');
		site = site || 'sina';	
		W('#weibo-oauth iframe').attr('src', server_url + server_path.bind + '?s=' + site);		
	},

	weibo.send = function(pid, msg, site, autobind){
		if(!QW.Connection.online){
			msgbox('未连接到网络', 'error');
			return;
		}
		var _this = this;
		pid = pid || '';
		site = site || 'sina';
		msg = msg || '';
		var weibo_setting_data = this.token.get(site);
		if(!weibo_setting_data){
			if(autobind !== false)
				this.bind(site);
			return;
		}
		msgbox('发送中...', 'wait');
		QW.Ajax.post(server_url + server_path.send, {
			id : pid,
			token : weibo_setting_data.oauth_token,
			token_secret : weibo_setting_data.oauth_token_secret,
			site : site
		}, function(d){			
			if('ok' == d.err){
				msgbox('发送成功！', 'success');
			} else {				
				switch(d.err){
					case ('err.token') :
						_this.bind(site);
						break;
					case ('err.resend') :
						msgbox(d.msg, 'success');
						break;
					default : 
						msgbox(d.msg, 'error');	
				}					
			}
			W('#message-box').signal('loaded');
		});
	}
	return weibo;
})();

function set_viewport(width){
    width = width || 640;
    var c = 320/width;
    setTimeout(function(){
        W('#viewport').attr('content', 'width=640,initial-scale=' + c + ', user-scalable=no');
    }, 100);
}

Dom.ready(function(){

	function reload(){
		if(!W('#setup').isVisible()){
			//不是从设置页点过来的，那就是从图片详情页点的, 记录cateid、toPage、total
			var hash = '#' + currentCate.id + ',' + myScroll.currPageX + ',' + (myScroll.pagesX.length - 1);
		}
		else{
			var hash = '#!';
		}

		window.location.replace('index.html?reload=' + Math.random() + hash);
	}

	window.addEventListener('message', function(e){
		W('#weibo-oauth').removeClass('selected');
        set_viewport(640);
        if('error' != e.data){
        	WEIBO.token.set(JSON.parse(e.data), 'sina');        	
        } else {
        	W("#bind-weibo span > span").replaceClass('on', 'off');  	
        	msgbox('绑定失败', 'error');
        }		
		
		reload();
	}, false);

	W(document).delegate('.i-share','tap', function(e){
		e.preventDefault();
		WEIBO.send(W(this).attr('data-pid'));
	});

	W('#weibo-oauth iframe').on('load', function(){
		set_viewport(320);
		document.removeEventListener("touchmove", preventBehavior);
		//取消phonegap的默认scroll..
		//frames[0].document.addEventListener("touchmove", preventBehavior, false);
		W('#weibo-oauth').addClass('selected');
		W('#message-box').signal('loaded');
	});

	W('#oauth-back').on('tap', function(){
		reload();
	});	
});









