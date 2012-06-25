<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>分类管理</title>
		<style type="text/css">
		#action {margin-bottom:40px}
		#upform {position:absolute;top:105px;left:8px}
		#upform p {margin:0;padding:0;}
		</style>
		<script type="text/javascript" src="http://m.weizoo.com/resource/js/apps/qwrap_mobile.src.js"></script>
	</head>
	<body>
		<h1>分类管理</h1>			
		<form method="post" action="/a/cate" id="cate-f">
			<p id="action">
				<label for="edit"><input type="radio" name="act" id="edit" value="edit" checked="checked" />修改</label>
				<label for="add"><input type="radio" name="act" id="add" value="add" />添加</label>
			</p>
			<p id="cate-choose">					
				选择分类：<select name="cateid" id="cateid">
					<?php
						foreach($cates as $cate){
							echo '<option value="' . $cate['id'] . '">' . $cate['name'] . '</option>';
						}
					?>
				</select>
			</p>
			<p id="cate-name">
				分类名字：
				<input name="catename" id="catename"  value="<?php echo $cates[0]['name'];?>">
			</p>
			<p id="cate-order">
				分类排序：
				<input name="order" id="order"  value="<?php echo $cates[0]['order'];?>">
			</p>
			<p id="cate-status">
				分类状态：
				<?php
					$status1 = '';
					$status0 = '';
					if($cates[0]['status']){
						$status1 = 'checked="checked" ';
					} else {
						$status0 = 'checked="checked" ';
					}
				?>
				<label for="status-1"><input type="radio" name="status" id="status-1" value="1" <?php echo $status1;?>/>启用</label>
				<label for="status-0"><input type="radio" name="status" id="status-0" value="0" <?php echo $status0;?>/>停用</label>
			</p>
			<input type="hidden" id="upload_rgb">
			<input type="hidden" name="cover" id="cover" value="<?php echo $cates[0]['cover'];?>">
			<input type="hidden" name="cover_rgb" id="cover_rgb"  value="<?php echo $cates[0]['cover_rgb'];?>">
			<p><button id="submit">提交</button></p>
			<p id="tips"></p>
		</form>
		<form method="post" action="/a/upload_img" id="upform" enctype="multipart/form-data" target="cateimgup">
			<p>选择图片：<input type="file" name="img" id="img" /></p>			
		</form>
		<p style="display:none">上传图：<br />
			<img id="coverimg" src="" />
		</p>
		<p>原图：<br />
			<img id="coverimg_old" src="http://weizoo-img.b0.upaiyun.com/<?php echo $cates[0]['cover'];?>" />
		</p>
		<iframe id="cateimgup" src="about:blank" style="display:none"></iframe>
		<script type="text/javascript">
			(function(){
				//upyun地址
				var IMG_DOMAIN = 'http://weizoo-img.b0.upaiyun.com/';
				//分类信息
				var cates = <?php echo json_encode($cates)?>;
				W('#img').on('change', function(){
					g('submit').disabled = true;
					g('upform').submit();
					W('#tips').html('正在上传...');
				});
				/**/
				var _ichange = ['#cover', '#cover_rgb', '#catename'];
				W('input[name="act"]').on('click', function(){
					g('cate-f').reset();
					if(this.value == 'add'){
						W('#catename').val('');
						g('status-0').checked = true;
						W('#coverimg_old').parentNode('p').hide();
						W('#cover_rgb').val('');					
						W('#cate-choose').hide();
					} else {
						W('#cate-choose').show();
						W('#coverimg_old').parentNode('p').show();
					}
					
					this.checked = true;
				});

				W('#cateid').on('change', function(e){
					cates.forEach(function(i){
						if(i.id == e.target.value){
							W('#catename').val(i.name);
							W('#order').val(i.order);
							W('#cover').val(i.cover);							
							if(W('#upload_rgb').val()){
								W('#cover_rgb').val(W('#upload_rgb').val());
							} else {
								W('#cover_rgb').val(i.cover_rgb);
							}							
							g('status-' + i.status).checked = true;
							W('#coverimg_old').attr('src', IMG_DOMAIN + i.cover).parentNode('p').show();
							return;
						}
					});
				});

				/*提交表单*/
				W('#cate-f').on('submit', function(e){
					e.preventDefault();					
					if(g('add').checked && !W('#catename').val()){
						alert('请输入分类名');
						g('catename').focus();
						return;
					}
					Ajax.post(this, function(d){
						if('ok' == d.err){
							alert('提交成功');
							window.location.search = Math.random();
						} else {
							alert('提交失败');
						}
					});
				});
				var uploaded = function(d){
					g('submit').disabled = false;
					setTimeout(function(){
						W('#tips').html('');
					}, 2000);	
					if(d.err != 'ok'){
						W('#tips').html('上传失败，原因' + d.msg);
						return;
					}
					W('#cover').val(d.data.url);
					W('#cover_rgb').val(d.data.rgb);
					W('#upload_rgb').val(d.data.rgb);
					W('#tips').html('上传成功');
					W('#coverimg').attr('src', IMG_DOMAIN + d.data.url).parentNode('p').show();	
				}
				window.uploaded = uploaded;
			})();
			
		</script>
	</body>
</html>