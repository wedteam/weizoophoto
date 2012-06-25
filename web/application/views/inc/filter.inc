<div id="fliter">
	<form action="<?php echo $_SERVER['PHP_SELF']?>">
		<input name="q" placeholder="关键字"<?php if (isset($_GET['q'])) echo ' value="' . htmlspecialchars($_GET['q']) . '"';?>>
		<select name="cateid">
			<option value="">所有</option>
			<?php
				foreach($cates as $ckey => $cate){
					if(isset($_GET['cateid']) && $ckey == $_GET['cateid']){
						echo '<option value="' . $ckey . '" selected="selected">' . $cate . '</option>';
					} else {
						echo '<option value="' . $ckey . '">' . $cate . '</option>';
					}
				}
			?>
		</select>
		<button type="submit">筛选</button>
		<a href="<?php echo $_SERVER['PHP_SELF']?>">重置条件</a>
	</form>
</div>