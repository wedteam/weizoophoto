<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>callback</title>
		<meta name="viewport" content="width=320, initial-scale=1, user-scalable=no;" />
		<script type="text/javascript">
			<?php
				if($token){
					$msg = json_encode($token);
				} else {
					$msg = 'error';
				}
			?>
			parent.postMessage('<?php echo $msg;?>', '*');
		</script>
	</head>
	<body>
	</body>
</html>