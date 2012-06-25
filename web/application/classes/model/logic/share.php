<?php defined('SYSPATH') or die('No direct script access.');

/**
 * 分享相关，如分享到微博
 */
class Model_Logic_Share extends Logic{
	const SDK_DIR = '/home/wwwlibs/sdks/weibo/';
	const base_cburl = 'http://m.weizoo.com/t/';
	private $site  = '';
	private $conf = null;
	private $TOKEN = array(
			'sina' => array(
					'sdk'    => 'sina/weibooauth.php',
					'key'    => '******',
					'secret' => '******',
					'cburl'  => 'weibocb'
				)
		);

	/*不想在实例化时传参数，所以不用原生构造函数*/
	private function _init($site){
		if(!in_array($site, array_keys($this->TOKEN))) {
			return false;
		}
		try{
			$this->site = $site;
			$this->conf = $this->TOKEN[$site];
			include_once(self::SDK_DIR . $this->conf['sdk']);
		}  catch(Exception $e){
			return false;
		}		
		return true;
	}

	private function bind_sina(){
		$t = new WeiboOAuth($this->conf['key'], $this->conf['secret']);
		$keys = $t->getRequestToken();
		$_SESSION['sina_keys'] = $keys;
		$aurl = $t->getAuthorizeURL($keys['oauth_token'], false, self::base_cburl . $this->conf['cburl']);
		return $aurl;
	}

	private function ver_sina($oauth_verifier){
		$t = new WeiboOAuth($this->conf['key'], $this->conf['secret'], $_SESSION['sina_keys']['oauth_token'] ,$_SESSION['sina_keys']['oauth_token_secret']);
		$keys = $t->getAccessToken($oauth_verifier);
		return $keys;
	}

	/*
	private function end_sina($data){
		$t = new WeiboOAuth($this->conf['key'], $this->conf['secret'], $data[1], $data[2]);
		$ret = $t->end_session();
		if(isset($ret['error_code'])){
			throw new Exception("发生错误");
			return;	
		}
		return true;
	}
	*/

	public function send($site, $data, $token){
		if(!$this->_init($site)){
			$this->ex_err('err.errsite', '未指定网站');
		}
		$ret = null;
		switch($site){
			/*新浪微博*/
			case 'sina' :
				$c = new WeiboClient($this->conf['key'], $this->conf['secret'], $token['oauth_token'], $token['oauth_token_secret']);
				$ret = $c->upload($data['status'], $data['pic']);
				if(isset($ret['error_code'])){
					switch ($ret['error_code']) {
						case '401':
							$this->ex_err('err.token', '需要登录');
							break;
						case '400':
							$this->ex_err('err.resend', '已发送');
							break;
						default:
							$this->ex_err('err.' . $ret['error_code']);
					}
				}
				break;
		}		
		return true;
	}

	public function short_url($url, $service = null){
		switch($service){
			case 'b.cn' :
				break;
			default :
				$_t = $this->TOKEN['sina'];
				include_once(self::SDK_DIR . $_t['sdk']);
				$c = new WeiboOAuth($_t['key'], $_t['secret'], $_t['oauth_token'], $_t['oauth_token_secret']);
				$ret = $c->get('http://api.t.sina.com.cn/short_url/shorten.json', array(
						'url_long' => $url,
						'source' => $_t['key']
					));
				if(count($ret) !== 1){
					return $url;
				}
				return $ret[0]['url_short'];
		}
	}

	/*对外bind()、end()和ver()*/
	public function __call($name, $arguments) {
		if(!$this->_init($arguments[0])){
			return false;
		}
		$method = $name . '_' . $this->site;
		return $this->$method($arguments);
	}
}