<?php defined('SYSPATH') or die('No direct access allowed.');

class Controller_T extends Controller {
	const UPYUN_DOMAIN  =  'http://weizoo-img.b0.upaiyun.com/';
	const WEIBOIMG_DIR = '/tmp/weizoo-img-weibo/';
	function before(){
		session_start();
		parent::before();
		$this->t = new Model_Logic_Share;
	}

	public function action_index(){
		$this->err(null, 'null');
	}

	public function action_test(){
	}

	public function action_bind(){
		try{
			if(!($ret = $this->t->bind($this->request->param('s','sina')))) {
				echo '暂不支持该服务账号绑定！';
				return;
			}
			/*
			if(!$this->request->param('r')){
				echo '需要返回app url，请重试';
				return;
			}
			$_SESSION['rediect_app'] = $this->request->param('r');
			*/
			$this->request->redirect($ret);
		} catch(Exception $e){
			echo '抱歉，发生错误!';
		}		
	}

	/*此方法无用*/
	/*
	public function action_end(){
		$q = $this->request->param();	
		if(empty($q['token']) || empty($q['token_secret'])) {
			$this->ok();
		}
		try{
			if($this->t->end($this->request->param('s', 'sina'), $q['token'], $q['token_secret'])) {
				$this->ok();
			}
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
		}		
	}
	*/

	public function action_weibocb(){
		/*
		if(!isset($_SESSION['rediect_app'])){
			echo '抱歉，发生错误！';
			return;
		}		
		$app_cb_url = urldecode($_SESSION['rediect_app']) . '?';
		*/
		try{
			$keys = $this->t->ver('sina', $this->request->param('oauth_verifier'));
		} catch(Exception $e){
			$keys = null;
		}
		if(!isset($keys['oauth_token']) || !isset($keys['oauth_token_secret'])) {
			$keys = null;
		}
		$this->template->set('token', $keys);
		//$this->request->redirect($app_cb_url);	
	}

	public function action_send(){
		$q = $this->request->param();
		if(empty($q['id'])) {
			$this->err(array('err' => 'err.noid'), '未指定图片');
		}
		$pid = (int) $q['id'];
		if(empty($q['token']) || empty($q['token_secret'])) {
			$this->err(array('err' => 'err.token'), '请先登陆');
		}
		$imgobj = new Model_Logic_Imgs;
		$ret = $imgobj->get_added_imgs(array('id' => $pid));
		if(!$ret['total']){
			$this->err(array('err' => 'err.nopic'), '未找到此图片信息');
		}
		$img = $ret['videos'][0];
		$status = !empty($q['status']) ? $q['status'] : $img['description'];
		$pic = self::UPYUN_DOMAIN . $img['sourceurl'] . '!weibo';

		$pic_short_url = $this->t->short_url(self::UPYUN_DOMAIN . $img['sourceurl']);
		$status_plus = '@薇著 [大图：' . $pic_short_url . ' ]';
		$left_len = 140 - mb_strlen($status_plus, 'UTF8');
		if(mb_strlen($status, 'UTF8') > $left_len) {
			$status = mb_substr($status, 0, --$left_len, 'UTF8');
		}
		$status = $status . ' ' . $status_plus;
		
		/*处理图片加文字*/
		if(!file_exists($pic_local = self::WEIBOIMG_DIR . $pid . '.png') && $img['description']){
			try{
				$create_ret = $imgobj->create_img_2_weibo($pid, $pic, $pic_local, $img['description']);
				if(!$create_ret){
					$pic_local = $pic;
				}
			} catch(Exception $e){
				$this->err(array('err' => $e->getMessage()));
				$pic_local = $pic;
			}
		}
		if(!$img['description']){
			$pic_local = $pic;
		}
		try{
			$this->t->send($q['site'], array(
				'status' => $status,
				'pic' => $pic_local
			), array(
				'oauth_token' => $q['token'],
				'oauth_token_secret' => $q['token_secret']
			));
		} catch(Exception $e){
			$errdata = json_decode($e->getMessage());
			if($errdata->err){
				$this->err(array('err' => $errdata->err), $errdata->msg);
			}
			$this->err(array('err' => 'unknow'), $e->getMessage());
		}
		$this->ok();
	}
}