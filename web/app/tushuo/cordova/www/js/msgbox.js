Dom.ready(function(){
    var show_box = function(msg, status, opt){
        W('#message-box').attr('class', '').addClass(status);
        W('#message-box p').html(msg);
        if(opt["pointer-events"]){
            W('#message-content').addClass('pointer-events');
        }
        W('#message-content').addClass('out').show();
    }

    var hide_box = function(){
        W('#message-content').removeClass('out').removeClass('pointer-events');
        W('#message-box').attr('class', '');
        W('#message-box .tap-button').removeClass('tap-button');
        W('#message-box p').html('');
    }

    /**
    * status = 'success' || 'error' || 'tips' || 'wait' || 'confirm'
    **/
    var signals = {
        'wait' : 'loaded',
        'confirm' : 'button-tap'
    };

    var _msgbox_id = 0;     
    window.msgbox = function (msg, status, opt){
        msg = msg || ''
        status = status || 'tips';
        opt = opt || {};
        if(typeof opt == "boolean"){
            opt = {"pointer-events": opt};
        }
        if(QW.ObjectH.isFunction(opt)){
            opt = {callback: opt};
        }

        //记录被点击的按钮
        W('#message-box .button').once('tap', function(evt){
            W(this).addClass('tap-button');
            if(status in signals){
                W('#message-box').signal(signals[status]);
            }
        });
                
        //如果有动画，那么先停止动画
        //W('#message-content').clearAnimate();
        show_box(msg, status, opt);

        (function(msgbox_id){
            W('#message-content').attr('data-msgbox-id', msgbox_id);

            if(!(status in signals)){
                setTimeout(function(){
                    var id = W('#message-content').attr('data-msgbox-id') | 0;

                    if(msgbox_id == id){
                        W('#message-content').fadeOut(300, function(){
                            hide_box();
                        });   
                    }

                    if(opt.callback){
                        opt.callback();
                    }
                }, 2000);
            }else{
                W('#message-box').wait(signals[status], function(){
                    clearTimeout(_timer);
                    //这里要变成异步的，这样的话后面的msgbox可以阻塞前面的msgbox的fadeOut
                    //W('#message-box').signal('loaded'); msgbox('another...')
                    setTimeout(function(){
                        var id = W('#message-content').attr('data-msgbox-id') | 0;
                        if(msgbox_id == id){
                            W('#message-content').fadeOut(300, function(){
                                hide_box();
                            });
                        }  
                    });

                    if(opt.callback){ 
                        opt.callback();
                    }
                });
                var _timer = setTimeout(function(){ //30s超时
                    W('#message-box').signal(signals[status]);
                    msgbox('请求超时', 'error');
                }, 30000);
            }
        })(_msgbox_id);

        return _msgbox_id++;
    }
});