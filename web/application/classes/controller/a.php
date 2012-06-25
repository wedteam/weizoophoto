<?php defined('SYSPATH') or die('No direct access allowed.');
/*图片API REST方式接口*/
/*先期只是简单的给自己用，用REST接口方式方便以后部分能直接对外和多终端方便前端取数据*/

class Controller_A extends Controller {
	function before(){
		parent::before();
		$this->img = new Model_Logic_Imgs;
	}

	/*后台首页*/
	public function action_index(){
		$this->response->body(__Template__);
	}

	/*类别管理*/
	public function action_cate(){		
		if($this->request->method() != 'POST'){
			try{
				$cates = $this->img->cates_info();
			} catch(Exception $e){
				$this->err(null, $e->getMessage());
				return;
			}
			$this->template->set('cates', $cates);
			$this->response->body(__Template__);
			return;
		}
		$act = $this->request->param('act');
		if('add' == $act){
			$method = 'add_cate';
		} elseif('edit' == $act){
			$method = 'edit_cate';
		} else {
			$this->err(null, '错误！');
		}
		try{
			$cates = $this->img->$method($this->request->param());
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok();
	}

	/*上传图片*/
	public function action_upload_img(){
		if($this->request->method() != 'POST'){
			$this->json(null, '访问错误');
		}
		try{
			$img_info = $this->img->upload();
		} catch (Exception $e){
			$ret = array(
				'err' => 'error',
				'msg' => $e->getMessage()
				);
			return;
		}
		$ret = array(
				'err' => 'ok',
				'data' => $img_info
			);
		$this->template->set('ret', $ret);
	}


	/*审核图片*/
	public function action_audit(){
		if($this->request->method() != 'POST'){
			try {
				$ret_srcs = $this->img->get_src_imgs($this->request->param());
			} catch(Exception $e){
				$this->err('pic.error', $e->getMessage());
				return;
			}
			$this->template->set('cates', $ret_srcs['cates']);
			$this->template->set('src_imgs', $ret_srcs['videos']);
			$this->template->set('total', $ret_srcs['total']);
			return;
		}
	}

	/*已审核图片*/
	public function action_added(){
		if($this->request->method() != 'POST'){
			try {
				$ret_srcs = $this->img->get_added_imgs($this->request->param());
			} catch(Exception $e){
				$this->err(null, $e->getMessage());
				return;
			}			
			$this->template->set('cates', $ret_srcs['cates']);
			$this->template->set('src_imgs', $ret_srcs['videos']);
			$this->template->set('total', $ret_srcs['total']);
			$this->response->body(__Template__);
			return;
		}
	}

	/*更新图片*/
	public function action_edit_img(){
		try {
			$upedFile = $this->img->edit_img($this->request->param());
		} catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;
		}
		$this->ok($upedFile);
	}

	/*展示图片*/
	public function action_show_img(){
		$url = $this->request->param('url');
		$type = 'image/jpeg';

		$p = split('\.', $url);
		if(count($p) > 1){
			$type = $p[count($p) - 1];
			if($type == 'gif'){
				$type = 'image/gif';
			}else if($type == 'png'){
				$type = 'image/png';
			}else{
				$type = 'image/jpeg';
			}
		}

		try{
			$content =file_get_contents($url);
			$this->response->headers(array('content-type' => $type))->body($content);
		}catch(Exception $e){
			$this->err(null, $e->getMessage());
			return;			
		}
		//$this->ok();
	}
}