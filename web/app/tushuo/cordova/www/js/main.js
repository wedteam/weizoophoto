var myScroll, cates = [], currentCate = {};
var img_server = 'http://weizoo-img.b0.upaiyun.com/';
var isPhonegap = typeof Cordova != 'undefined';
var pageLimit = 20; //每个类目最多加载20页
var pageSize = 5; //每页加载5张图

//更新图片
function update_images(id, limit, offset, options){
    limit = limit || 5;
    offset = offset || 0;
    options = options || {};

    var cateid = id; //save cateid

    function update(items, total){
        if(offset == 0){
            W("#wrap .show").forEach(function(el){
                W("#wrap").removeChild(el);
            });
            W("#wrap").css("width", "640px");
        }
        var loaded_imgs = W("#wrap .show") || [];

        if(loaded_imgs.length <= offset){

            currentCate = {id:cateid, total:total};


            if(total > 0 && items.length > 0){
                
                for(var i = 0; i < items.length; i++){
                    var item = items[i];

                    var tmpl = W("#template").getValue();
                    var host = item.referer?item.referer.match(/\w+\:\/\/([\w.]*)/):null;
                    if(host){
                        host = host[1];
                        host = host.split('.');
                        if(host.length <= 2){
                            host = host[0];
                        }else{
                            host = host[1];
                        }
                    }
                    var html = QW.StringH.tmpl(tmpl, 
                        {
                            imgsrc:img_server+item.sourceurl, 
                            content:(item.description || '').stripTags(),
                            title:(item.title || '').stripTags(),
                            referer: host,
                            rgb:item.rgb,
                            id : item.id
                        });
                    elW = W('<div class="m show"></div>').setHtml(html);

                    //必须给图片高度
                    var img = elW.query('.image-page .img-box');
                    img.css('height', item.height + 'px');
                    if(item.height > 960 * 0.618){
                        elW.query('.topbar').hide();
                    }
                    //W("#wrap").appendChild(elW);
                    W("#wrap .more").insert("beforebegin", elW);
                    var p = new iScroll(elW.query('.image-page')[0], {hScroll:false,vScrollbar:false,useTransform:isPhonegap,useTransition:isPhonegap});
                    elW[0].scroller = p;
                }
                var imgs = W("#wrap .show");
                var width = 640+640 * imgs.length+640;
                W("#wrap").css("width", width+"px");
            }
        }

        if(items.length == 0){
            msgbox('数据加载失败', 'error');
            return;
        }

        myScroll.refresh();
        if(options.oncomplete){
            options.oncomplete();
        }
    }

    function loadCache(){
        //如果超时了读取缓存
        var data = loadImgs(cateid, limit, offset);

        if(data){
            var total = data.total;
            var imgs = data.imgs;
            update(imgs, total);                   
        }else{
            msgbox('数据读取失败', 'error');
        }
        return false;
    }

    if(options.useCache){
        loadCache();
        return;
    }

    //读数据并且允许继续交互
    msgbox('Loading...', 'wait');
    QW.Ajax.get('http://m.weizoo.com/api/get_imgs', {limit:limit, offset:offset, cateid:id, m:Math.random()},
        function(data){
            W('#message-box').signal('loaded');
            if(data.err == 'ok'){
                var data = data.data;
                var total = data.total;
                var imgs = data.videos;
                update(imgs, total);
                saveImgs(cateid, offset, imgs);
            }else{
                loadCache();
            }
        });
}

//更新封面
function update_cover(firstUpdate){

    var appData = localStorage.get(app.name) || {}; 
    function update(){

            var cover = W('#index .cover');
            cover.html('');

            for(var i = 0; i < cates.length; i++){
                var cate = cates[i];
                if(cate.total == 0) continue; //分类下面没有内容的不用显示出来
                //if(cate.id == '1') continue; //跳过'其他'分类
                var li = W('<li id="' + cate.id + '" index="' + i + '"></li>');
                var cover_img = W('<div class="imgbox" data-src="' + img_server + cate.cover + '"/>');

                //异步加载图片，提高流畅度
                cover.wait('_loadimg', (function(imgbox){
                    return function(){
                        var quality = '!t128';
                        if(!QW.Connection.online || QW.Connection.wifi || QW.Setting.get('tushuo.auto_download_2g') != 0){
                            quality = '!s640';
                        }

                        var src = imgbox.attr('data-src');
                        ImageLoader.load(src, function(){
                            imgbox.css('background-image', 'url(' + src + ')');
                            cover.signal('_loadimg');
                        });
                    }
                })(cover_img));

                cover_img.css('background-color', cate.cover_rgb);

                if(cate.description){
                    cover_img.attr('title', cate.description);
                }

                var title = W('<div class="title"></div>');
                var count = cate.total - (appData[cate.id] ? appData[cate.id].total : 0);
                count = count > 0 ? count : 0;

                title.html('<h2>' + cate.name + '</h2><span class="n c'+ count + (count > 100 ? ' more' : '') + '">' + Math.min(count, 99) + '</span>');
                li.appendChild(cover_img).appendChild(title);
                cover.appendChild(li);
            }
            saveCates(cates);
            sessionStorage.set('refresh_time', (new Date()).getTime()); //记录下刷新时间
            var page1Scroll = new iScroll('image-index', 
                        {
                            hScroll:false, 
                            vScrollbar:false,
                            useTransform:isPhonegap,
                            useTransition:isPhonegap/*,
                            onScrollMove: function(){
                                if(this.y > 0 && this.y < 200){
                                    if(W("#index .refresh-tip").hasClass('flip')){
                                        W("#index .refresh-tip").removeClass('flip').clearSequence('refresh').html('下拉更新封面数据');
                                    }
                                }else if(this.y > 200){
                                    if(!W("#index .refresh-tip").hasClass('flip')){
                                        W("#index .refresh-tip").addClass('flip').wait('refresh', function(){
                                            update_cover(true);
                                        }).html('释放刷新');
                                    }
                                }
                            },
                            onScrollEnd:function(){
                                W("#index .refresh-tip").removeClass('flip').signal('refresh');
                            }*/
                        });  
            cover.insert('afterbegin', W('<li class="refresh-tip">下拉更新封面数据</li>'));      
    }

    function loadCache(){
        //如果超时了读取缓存
        var data = loadCates();
        if(data){
            cates = data;
            update();
        }else{
            msgbox('数据读取失败', 'error');
        }        
    }

    /**
     <li id="1">
            <img src="images/c.jpg">
            <div class="title">
                <h2>新闻</h2>
                <span class="n">4</span>
            </div>
        </li>
    **/
    msgbox('Loading...', 'wait');
    QW.Ajax.get('http://m.weizoo.com/api/cates_info', {status:1, m:Math.random()}, function(data){
        W('#message-box').signal('loaded');
        if(data.err == 'ok'){
            cates = data.data;
            needUpdate = firstUpdate;
            for(var i = 0; i < cates.length; i++){
                var cate = cates[i];
                cate.count = cate.total - (appData[cate.id] ? appData[cate.id].total : 0);
                if(cate.count)
                    needUpdate = true;
            }
            if(needUpdate)
                update();            
        }else{
            loadCache();
        }
    });
}

//更新设置页
function update_setting(){
    var auto_download = QW.Setting.get('tushuo.auto_download_2g');
    
    if(auto_download == null) 
        auto_download = 1;

    if(auto_download == 1){
        W("#auto-download-2g span > span").replaceClass('off', 'on');
    }else{
        W("#auto-download-2g span > span").replaceClass('on', 'off'); 
    }

    var bind_weibo = QW.Setting.get('tushuo.weibo.sina');
    if(bind_weibo){
        W("#bind-weibo span > span").replaceClass('off', 'on');
    }else{
        W("#bind-weibo span > span").replaceClass('on', 'off');
    }

    //W("#storage span").html(localStorage.size(app.name) + 'MB');
}

function init_setting(){
    W(document).delegate("#storage", "tap", function(){
        msgbox('确定清除本地图片缓存吗', 'confirm', function(){
            if(W('#message-box .tap-button').hasClass('ok')){
                localStorage.del(app.name);
                //W("#storage span").html(localStorage.size(app.name) + 'MB');
                setTimeout(function(){
                    msgbox('清除成功');
                }, 1000);
                sessionStorage.del('refresh_time');
            }
        });
    });

    W(document).delegate("#auto-download-2g .tips", "tap", function(){
        if(W("#auto-download-2g span > span").hasClass('on')){
            QW.Setting.set('tushuo.auto_download_2g', 0);
        }else{
            QW.Setting.set('tushuo.auto_download_2g', 1);
        }
        update_setting();
    });

    W(document).delegate("#bind-weibo .tips", "tap", function(){
        W("#bind-weibo span > span").toggleClass('on', 'off');
        if(W("#bind-weibo span > span").hasClass('off')){
            /*清除weibo cookie信息，防止授权自动登陆*/
            QW.Ajax.get('http://weibo.com/logout.php', '', function(d){});
            /*不管是否成功，清除本地信息*/
            QW.Setting.del('tushuo.weibo.sina');
        }else{
            WEIBO.bind('sina');
        }
        //update_setting();
    });  
}

function goto_setup(async){
    W("#wrap").css("width", "1280px");
    W("#index").insert('afterend', W("#setup")); //设置页插入
    update_setting(); //更新设置内容
    myScroll.refresh();
    if(async === false){
        myScroll.scrollToPage(1, 0, 0);
    }else{
        setTimeout(function(){
            myScroll.scrollToPage(1);
        }, 200);
    }
}

function maybe_update_cover(){
    if(W("#index .cover li").length <= 0 || 
        (new Date()).getTime() - (sessionStorage.get('refresh_time') || 0) > 3600000 * 4) //如果关闭超过4小时
    {
        update_cover(true);
    }    
}

function show_goback(){
    var anim = W("#goback").animator();
    if(!anim){
        W("#goback").sleep(100).fadeIn(100).sleep(2000).fadeOut(500);
    }
}

function main() {

    W(document).on("resume", function(){
        maybe_update_cover();
    });

    //隐藏地址栏
    window.addEventListener('load', function(){
        setTimeout(function(){ window.scrollTo(0, 1); }, 100); 
    });

    window.addEventListener('orientationchange', function(){
        setTimeout(function(){ window.scrollTo(0, 1); }, 100); 
    });

    W(document).delegate('.i, .back, .opt li, .has-hover', 'touchover', function(){
        W(this).addClass('hover');
    }).delegate('.i, .back, li, .opt li, .has-hover', 'touchleave', function(){
        var me = this;

        setTimeout(function(){
            W(me).removeClass('hover');
        }, 100);
    });

    //封面类目的点击事件
    W(document).delegate('#index .cover li', 'tap',function(){
        var id = W(this).core.id;
        var index = W(this).attr('index') | 0;
        var total = cates[index].total;

        var n = W(this).query('.n');

        update_images(id, pageSize, 0, {
            oncomplete:function(){
                n.addClass('c0');
                update_cate(id, total);
                myScroll.enable();
                myScroll.scrollToPage(1);
            }
        });
    });

    //点击图片详情页的时候显示返回封面的按钮
    W(document).delegate('.show .img-box, .show .etc > h3, .show .etc > p', 'tap', show_goback);

    //点击返回封面按钮回到封面
    W('#goback').on('tap',function(){
        setTimeout(function(){
            myScroll.enable();
            myScroll.scrollToPage(0);
        },200);
    });

    //点击封面的设置按钮，进入设置页
    W("#optSetting").on('tap',function(){
        goto_setup();
    });
    
    //设置页左上角的按钮返回到封面
    W('#back').on('tap',function(){
        setTimeout(function(){
            myScroll.enable();
            myScroll.scrollToPage(0);
        }, 200);   
    });

    //保存到相册
    W(document).delegate('.i-fav', 'tap', function(){
        var imgurl = W(this).attr('data-imgurl');
        
        if(Cordova && QW.Connection.online){
            msgbox('正在下载图片', 'wait');
            ImageLoader.load(imgurl, function(image){
                W("#message-box").signal('loaded');
                msgbox('图片保存中', 'wait');
                Cordova.exec("ImageHelper.saveToUserLibrary", image.data);
            });
        }else{
            msgbox('未连接到网络', 'error');
        }
    });

    (function(){
        var startX, startY, distance0, x0 = 0, y0 = 0, scale0 = 100;
        //代理图片上的缩放事件
        W(document).delegate('.show .img-box', 'touchmove', function(e){

            if(myScroll.rolling) return;

            var touchEls = e.touches;
            var imgsrc = W(this).css('background-image');

            if(!imgsrc || /!t128/.test(imgsrc)){
                return;
            }

            if(scale0 > 100 || touchEls.length > 1){
                //加载原图？ 太大了
                /*if(QW.Connection.online && !W(this).attr('data-bigpic')){
                    
                    var imgurl = imgsrc.replace('!s640', '').slice(4, -1);

                    W(this).attr('data-bigpic', imgurl);

                    var me = this;
                    ImageLoader.load(imgurl, function(){
                        W(me).css('background-image', 'url(' + imgurl + ')');    
                    });
                }*/
                W(this).parentNode('.show')[0].scroller.disable();
                myScroll.disable();

                var t0 = touchEls[0];
                var t1 = touchEls[1] || touchEls[0];
                
                var x = 0.5 * (t0.clientX + t1.clientX);
                var y = 0.5 * (t0.clientY + t1.clientY);
                
                if(touchEls.length > 1){
                    var distance = Math.sqrt((t0.clientX - t1.clientX) * (t0.clientX - t1.clientX) + (t0.clientY - t1.clientY) * (t0.clientY - t1.clientY));
                }

                if(!startX || !startY){
                    startX = x;
                    startY = y;
                    distance0 = distance;
                }

                var dx = x - startX;
                var dy = y - startY;
                
                //if(dx < 6 && dy < 6)
                    //return;

                var ox = x0 + dx, oy = y0 + dy;

                if(distance0 && distance){
                    var scale = Math.round(scale0 * distance / distance0);
                    scale = Math.min(scale, 200);
                    scale = Math.max(scale, 75);

                    if(scale >= 200 || scale <= 75){
                        return;
                    }

                    ox = ox * scale / 100;
                    oy = oy * scale / 100;

                    if(scale > 100){
                        var size = W(this).getSize();
                        if(ox < 0)
                            ox = Math.max(-size.width * (scale / 100 - 1), ox);
                        if(oy < 0)
                            oy = Math.max(-size.height * (scale / 100 - 1), oy);
                    }
                    W(this).css('background-size', scale+'%');
                }
                //console.log([ox+"px", oy+"px"].join(' '));
                W(this).css('background-position', [ox+"px", oy+"px"].join(' '));
            }
        }).delegate('.show .img-box', 'touchend', function(e){
            var size = W(this).getSize();
            var scale = parseInt(W(this).css('background-size'));
            if(scale < 120){
                W(this).css('background-size', '100%');
                W(this).css('background-position', '');
                x0 = y0 = 0, scale0 = 100;
                W("#wrap").clearSequence('disable_myscroll');
                myScroll.enable();
                W(this).parentNode('.show')[0].scroller.enable();
            }else{
                var mx = -size.width * ((scale/100) - 1);
                var my = -size.height * ((scale/100) - 1);
                var d = W(this).css('background-position').split(' ');
                var dx = parseInt(d[0]);
                var dy = parseInt(d[1]);

                if(dx < mx) dx = Math.ceil(mx);
                if(dy < my) dy = Math.ceil(my);
                if(dx > 0) dx = 0;
                if(dy > 0) dy = 0;
                
                W(this).css('background-position', [dx+'px', dy+'px'].join(' '));
                x0 = dx, y0 = dy, scale0 = scale;
            }

            startX = startY = distance0 = null;
        });
    })();

    //------初始化主界面------
    var show_goback_once = FunctionH.once(show_goback);
    myScroll = new iScroll('doc', 
                {
                    bounce: true,
                    bounceLock: true,
                    vScroll:false, 
                    useTransform: isPhonegap,
                    useTransition: isPhonegap,
                    snap:'div.m', 
                    snapThreshold:180,
                    momentum:false, 
                    hScrollbar:false, 
                    vScrollbar:false,
                    onScrollStart: function(){
                        this.startPageX = this.currPageX;
                        this.rolling = true;
                    },
                    /*onTouchEnd: function(){
                        setTimeout(function(){
                            if(W('.more .refresh-tip').hasClass('flip')){
                                W('.more .refresh-tip').removeClass('flip').signal('loadPic').html('左拉加载更多');
                            }
                        });
                    },
                    onScrollMove: function(){
                        var dx = this.x - this.maxScrollX;
                        var tipEl = W('.more .refresh-tip');
                        var offset = this.currPageX;

                        if(dx < 640){
                            if(offset < currentCate.total){
                                tipEl.removeClass('nomore');
                                if(dx > 400){
                                    if(tipEl.hasClass('flip')){                              
                                        tipEl.removeClass('flip').html('左拉加载更多');
                                        W('#wrap').clearSequence('loadPic');
                                    }                                
                                }else if(dx < 400){
                                     if(!tipEl.hasClass('flip')){
                                        tipEl.addClass('flip').html('释放刷新');
                                        tipEl.wait('loadPic', function(){
                                            //载入新的
                                            (function(id, offset){
                                                setTimeout(function(){
                                                    update_images(id, 5, offset); //一次加载5张
                                                });
                                            })(currentCate.id || 1, offset);
                                        });
                                    }                                   
                                }                                
                            }else{
                                if(!tipEl.hasClass('nomore')){
                                    tipEl.removeClass('flip').addClass('nomore').html('没有新图片了');
                                }
                            }
                        }
                    },*/
                    onScrollEnd: function(){
                        //如果有disable消息，这里执行disable
                        this.rolling = false;

                        //console.log([this.x, this.currPageX].join(' '));
                        if(this.startPageX == this.currPageX) return; //没有换页

                        //W("#goback").clearAllAnimate().hide(); //有不明bug...

                        if(this.currPageX > 0){
                            var pages = W('#wrap .m');
                            pages.removeClass('top');
                            var page = pages[this.currPageX];
                            W(page).addClass('top'); //增加ontop样式

                            var imgbox = W(page).query('.img-box')[0];
                            if(imgbox){
                                var src = W(imgbox).attr('data-src');
                                if(src){
                                    
                                    W(imgbox).removeAttr('data-src');
                                    ImageLoader.load(src + '!t128', function(){
                                        
                                        W(imgbox).css('background-image', 'url(' + src + '!t128)');
                                        
                                        if(!QW.Connection.online || QW.Connection.wifi || QW.Setting.get('tushuo.auto_download_2g') != 0){
                                            (function(src, imgbox){
                                                Async.wait("_load_bigpic", function(){
                                                    ImageLoader.load(src + '!s640', function(){
                                                          W(imgbox).css('background-image', 'url(' + src  + '!s640)');  
                                                    });
                                                    Async.signal('_load_bigpic');
                                                });
                                            })(src, imgbox);
                                        }

                                    });
                                    //W(imgbox)[0].src = src + quality;
                                }

                                if(location.hash && location.hash != "#!"){
                                    location = "#!";
                                    WEIBO.send(W(page).query('.i-share').attr('data-pid'), null, null, false);
                                }
                                if(!location.hash){
                                    show_goback_once();
                                }
                            }
                        }else{
                            //封面页
                            this.disable();

                            if(W('#setup').isVisible()){
                                //将设置页隐藏
                                W('#setting').appendChild(W("#setup"));
                                var me = this;
                                me.refresh();
                            } 
                            
                            maybe_update_cover();
                            //W('#index .cover').signal('update_cover');                                  
                        }
                        if(this.pagesX.length - 1 == this.currPageX){
                            var offset = this.currPageX;
                            if(offset < currentCate.total && offset < pageSize * pageLimit){
                                //载入新的
                                (function(id, offset){
                                    setTimeout(function(){
                                        update_images(id, pageSize, offset); 
                                    });
                                })(currentCate.id || 1, offset);
                            }
                        }                 
            
                        if(this.currPageX == 1){
                            if(W('#setup').isVisible()){
                                this.disable(); //设置页不能scroll
                            }                                      
                        }
                    }
                });

    myScroll.disable();
    
    //加载设置
    init_setting();

    if(location.hash){
        var m = /#(\d+),(\d+),(\d+)/.exec(location.hash);
        if(m){
            var id = m[1]|0;
            var limit = m[3]|0;
            var toPage = m[2]|0;
            update_images(id, limit, 0, {useCache:true, oncomplete:function(){myScroll.enable();myScroll.scrollToPage(toPage,0,0)}});
        }
        else{
            goto_setup(false);
        }
    }
    else{
        //加载封面数据
        maybe_update_cover();
    }
}