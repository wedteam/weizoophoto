<?php defined('SYSPATH') or die('No direct access allowed.');

class Controller_Fetch extends Controller {

	/*
	 	Ajax.post(url, {source:'www.baidu.com', script:code}, callback);

	 	TODO: 用缓存， source 做 cache-key， 存script和json，如果script变化了，刷新，否则直接读取缓存
	 */
	public function action_index(){
		$v8 = new Model_Pylogic_V8();

		$url = $this->request->param('source');
		$script = $this->request->param('script','function(){}');

		$r = $v8->fetch($url, $script);

		$this->response->json($r); 
	}

	public function action_test(){
		$v8 = new Model_Pylogic_V8();
		$r = $v8->fetch('www.baidu.com','function(d){return {x:d.getElementsByTagName("title")[0].innerHTML}}');
		$this->response->json($r);
	}

}