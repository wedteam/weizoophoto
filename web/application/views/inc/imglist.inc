<div class="src-imgs">
	<ul id="imgs-list" class="cls">
		<?php
			foreach ($src_imgs as $img) {
				/*这里在这里是临时演示*/
				if(substr($img['sourceurl'], 0, 4) != 'http'){
					$img['sourceurl'] = $upyun_domain . $img['sourceurl'];
				}else{
					foreach($forbidden_domains as $fd){
						if(strpos($img['sourceurl'], $fd)){
							$img['show_sourceurl'] = 'http://m.weizoo.com/a/show_img?url=' . urlencode($img['sourceurl']); //外站防盗链
						}
					}
				}
		?>
			<li class="img-wrap">
				<div class="img-inner" data-pid="<?php echo $img['id']?>">
					<img src="<?php echo array_key_exists('show_sourceurl', $img)?$img['show_sourceurl']:$img['sourceurl']?>">
					<div class="info">
						<p style="word-wrap:word">
							<?php echo strip_tags($img['description'])?>
						</p>
					</div>
				</div>
			</li>
		<?php
			}
		?>
	</ul>
</div>

<!--
	<form method="post" class="edit-f" action="/a/edit_img">
							<input type="hidden" name="pid" value="<?php echo $img['id']?>">
							<input type="hidden" name="sourceurl" value="<?php echo $img['sourceurl']?>">
							<p>
								<input name="title" placeholder="标题" value="<?php echo $img['title']?>">
							</p>
							<p>
								<textarea name="description" placeholder="描述" rows="3"><?php echo strip_tags($img['description'])?></textarea>
							</p>
							<p>
								<select name="cateid">
									<?php
										foreach($cates as $ckey => $cate){
											if($ckey == $img['cateid']){
												echo '<option value="' . $ckey . '" selected="selected">' . $cate . '</option>';
											} else {
												echo '<option value="' . $ckey . '">' . $cate . '</option>';
											}
										}
									?>
								</select>
							</p>
							<p>
								<a href="<?php echo $img['sourceurl']?>" title="点击查看原图" target="img<?php echo $img['id']?>">原图</a>
								<a href="<?php echo $img['referer']?>" target="source<?php echo $img['id']?>" title="<?php echo $img['referer']?>">来源页面</a>
							</p>
							<p class="btns">
								<input type="hidden" name="status" value="1">
								<button type="submit">提交</button>
								<button type="reset">取消</button>
							</p>
						</form>
						-->