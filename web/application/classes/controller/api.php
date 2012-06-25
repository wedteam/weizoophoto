<?php defined('SYSPATH') or die('No direct access allowed.');
/*图片API REST方式接口*/
/*先期只是简单的给自己用，用REST接口方式方便以后部分能直接对外和多终端方便前端取数据*/

class Controller_Api extends Controller {
	protected $auto_jsonp = True; //开放jsonp接口

	function before(){
		parent::before();
		$this->imgdb = new Model_Logic_Imgs;
	}

	public function action_index(){
		$this->err(null, 'Access deny!');
	}

	/*获取分类*/
	public function action_get_cates(){
		try {
			$ret = $this->imgdb->get_cates();
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok($ret);
	}

	/*获取分类详细信息*/
	public function action_cates_info(){
		$_status = $this->request->param('status');
		$status = $_status === null ? null : (int) $_status;
		$ids = array();
		if($this->request->param('ids')){
			$ids = explode(',', $this->request->param('ids'));
		}
		$orderby = $this->request->param('orderby', 'order,asc');
		try {
			$ret = $this->imgdb->cates_info($status, $ids, $orderby);
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok($ret);
	}

	/*获取已审核图片*/
	public function action_get_imgs(){
		try {
			$ret = $this->imgdb->get_added_imgs($this->request->param());
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok($ret);
	}

	/*获取图片信息*/
	public function action_img_info(){
		if(!$this->request->param('id')){
			$this->err(null, 'empty pid');
		}
		try {
			$ret = $this->imgdb->get_imgs(array(
				'id' => (int) $this->request->param('id')
				));
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok($ret['videos'][0]);
	}

	/*添加图片*/
	public function action_add(){
		try {
			$this->imgdb->add_img($this->request->param());
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok();
	}
}