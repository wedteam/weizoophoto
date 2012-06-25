<!doctype html>
<?php	
	$upyun_domain = 'http://weizoo-img.b0.upaiyun.com/';
	$forbidden_domains = array(
			'aicdn.com',
			'126.net'
		);

/*
API key：791573857
keyfrom：weizoo
*/

?>
<html>
	<head>
		<meta charset="utf-8">
		<title><?php echo $title?></title>		
		<link rel="stylesheet" type="text/css" href="http://m.weizoo.com/resource/css/common/common.css">
		<link rel="stylesheet" type="text/css" href="http://m.weizoo.com/resource/css/photo/imgshow.css">
		<script type="text/javascript" src="http://m.weizoo.com/resource/js/apps/qwrap_mobile.src.js"></script>
	</head>
	<body>
		<h1><?php echo $title?></h1>
		<?php
			include_once(INCPATH . 'filter.inc');
			include_once(INCPATH . 'imglist.inc');
		?>		
		<div id="pager">
		</div>

		<div id="panel" class="panel">
			<div class="panel-content">
				<div class="hd">
					<h3>图片详情</h3>
				</div>
				<div class="bd">
					<div class="img">
						<a href="#" id="photo_src" target="_blank">
							<img id="photo" src="" />
						</a>
						<p id="old-desc">
							<?php echo strip_tags($img['description'])?>
						</p>
						<p>
							来源：<a id="fromurl" href="#" target="_blank" title="未知">未知</a>
						</p>
					</div>
					<div class="data">
						<form method="post" class="edit-f" action="/a/edit_img">
								<input type="hidden" name="pid" id="pid">
								<input type="hidden" name="sourceurl" id="sourceurl">
								<p>
									<textarea name="description" id="description" placeholder="请输入描述" rows="3"></textarea>
								</p>
								<p>类别：
									<select name="cateid" id="cateid">
										<?php
											foreach($cates as $ckey => $cate){
												echo '<option value="' . $ckey . '">' . $cate . '</option>';
											}
										?>
									</select>
								</p>
								<p>
									状态：
									<label for="status0">
										<input type="radio" id="status0" name="status" value="0">
										<span>未审核</span>
									</label>
									<label for="status1">
										<input type="radio" id="status1" name="status" value="1">
										<span>通过审核</span>
									</label>
									<label for="status2">
										<input type="radio" id="status2" name="status" value="2">
										<span>删除</span>
									</label>								
								</p>
								<p>
									<button type="submit">提交</button>									
								</p>
						</form>
					</div>
				</div>
			</div>
			<div class="close">X</div>
			<div class="change-size">口</div>
		</div>
		<div id="mask" class="panel">
		</div>

		<script type="text/javascript">
			var P = function(sel){
				this.panel = W(sel);
				this.upyun_uri = 'http://weizoo-img.b0.upaiyun.com/';
				this.init();
			};

			ObjectH.mix(P.prototype, {
				init : function(){
					var _this = this;					
					W('#mask').on('click', function(e){
						e.preventDefault();
						_this.hide();
					});
					W('.close').on('click', function(e){
						e.preventDefault();
						_this.hide();
					});
					W(document).on('keydown', function(e){
						var k = (e||event).keyCode;
						if(27 == k){
							_this.hide();
						}
					});

					W('.change-size').on('click', function(e){
						e.preventDefault();
						W('#photo').toggleClass('min');
						_this.setHeight();
					});

					QW.use('Ajax', function(){
						W('.edit-f').on('submit', function(e){
							e.preventDefault();
							Ajax.post(this, function(d){
								if ('ok' == d.err) {
									alert('提交成功');
									_this.hide();
								} else {
									alert(d.msg)
								}
							});
						});
					});
				},
				update_data : function(){
					var _this = this;
					QW.use('Ajax', function(){
						Ajax.get('/api/img_info',{
							id : _this.pid,
							_r : Math.random()
						}, function(d){
							if('ok' == d.err){
								var data = d.data;
								var src = 'http' == data.sourceurl.substr(0, 4) ? data.sourceurl : _this.upyun_uri + data.sourceurl;

								W('#photo_src').attr('href', src);
								W('#photo').attr('src', src);
								W('#sourceurl').val(src);
								W('#old-desc').html(StringH.stripTags(data.old_description || ''));
								g('pid').value = data.id;
								g('cateid').value = data.cateid;
								W('#fromurl').attr('href', encodeURI(data.referer || '未知')).attr('title', StringH.encode4HtmlValue(data.referer || '未知')).html(StringH.encode4Html(data.referer || '未知'));
								
								W('#status' + data.status).attr('checked', true);
								//W('label span').removeClass('now');								
								//W('span', W('#status' + data.status).parentNode('label')).addClass('now');
								W('#description').val(StringH.stripTags(data.description || ''));

								_this.panel.show();
								W('#photo').on('load', function(){
									_this.setHeight();
								});
								
							} else {
								alert(d.msg || '发生错误');
							}
						});
					});
				},
				show : function(){
					W('#photo').removeClass('min');
					this.update_data();
					//this.panel.show();
				},
				hide : function(){
					this.panel.hide();
					W('#description').val('');
					W('#panel input[type=radio]').attr('checked', false)
				},
				setHeight : function(){					
					W('#panel').css('top', Math.max(0, ((W('#mask').getRect().height - W('#panel').getRect().height)/2)) + 'px');
				}
			});

			var p = function(pid){
				var _p = window.imgshowPanel || (window.imgshowPanel = new P('.panel'));				
				_p.pid = pid;
				return _p;
			}

			Dom.ready(function(){
				QW.use('Pager', function(){
					W('#pager').Pager({
						total : <?php echo $total;?>,
						size : 30,
						qoffset : 'offset',
						qsize : 'size',
						offset : 30
					});
				});

				W('.img-inner').on('click', function(e){
					e.preventDefault();
					var pid = parseInt(W(this).attr('data-pid'), 10);
					p(pid).show();
				});				
			});
		</script>
	</body>
</html>