<?php defined('SYSPATH') or die('No direct script access.');

/**
 * 图片处理相关
 */
class Model_Logic_Imgs extends Logic{
	/*获取所有分类*/
	public function get_cates(){
		$objQueryBuilderCate = DB::select()->from('photo_catelogs');
		$resultCate = $objQueryBuilderCate->execute()->as_array();
		$cates = array();
		foreach($resultCate as $c){
			$cates[$c['id']] = $c['name'];
		}
		return $cates;
	}

	/**
	*获取分类信息
	* 第一个参数为array时候，则把第一个参数当ids，获取指定ids的信息，忽略status
	**/
	public function cates_info($status = null, $ids = null, $orderby = 'order,asc'){
		$objQueryBuilderCate = DB::select()->from('photo_catelogs');
		if($ids || gettype($status) == 'array'){
			if(!$ids){
				$ids = $status;
			}
			$ids = gettype($ids) != 'array' ? array($ids) : $ids;
			$objQueryBuilderCate = $objQueryBuilderCate->and_where_open();
			foreach($ids as $id){
				$objQueryBuilderCate = $objQueryBuilderCate->or_where('id', '=', mysql_real_escape_string($id));
			}
			$objQueryBuilderCate = $objQueryBuilderCate->and_where_close();
		}
		if(gettype($status) == 'integer'){
			$objQueryBuilderCate = $objQueryBuilderCate->and_where('status', '=', $status);
		}

		/*添加排序*/
		$order = explode(',', $orderby);
		$objQueryBuilderCate = call_user_func_array(array($objQueryBuilderCate, 'order_by'), $order);

		$resultCate = $objQueryBuilderCate->execute()->as_array();
		/*添加类目总图片数*/
		foreach ($resultCate as $k => $cate) {
			$_r = $this->get_imgs(array(
				'cateid' => $cate['id'],
				'status' => 1
			), $offset=0, $limit=0);
			$resultCate[$k] = array_merge($cate, array('total' => $_r['total']));
		}
		return $resultCate;
	}

	/**
	* 添加分类
	**/
	public function add_cate($data){
		if(!isset($data['catename'])){
			throw new Exception("没有指定分类名");
			return;			
		}
		$data2db = array();
		foreach ($data as $k => $v) {
			$data2db[$k] = mysql_real_escape_string(htmlspecialchars($v));
		}
		$time = time();
		$data2q = array(
			'name' => $data2db['catename'],
			'cover' => $data2db['cover'],
			'cover_rgb' => $data2db['cover_rgb'],
			'createdate' => $time,
			'updatedate' => $time
		);
		$objQueryBuilder = DB::insert('photo_catelogs', array_keys($data2q))->values(array_values($data2q));	
		$objDb = Database::instance('master');
		$arrRes = self::_execQueryBuilder($objQueryBuilder, $objDb);
		JKit::$log->info($objDb->last_query, $arrRes);
	}

	/**
	* 修改分类
	**/
	public function edit_cate($data){
		if(!isset($data['cateid'])){
			throw new Exception("没有指定分类");
			return;			
		}
		$data2db = array();
		foreach ($data as $k => $v) {
			$data2db[$k] = mysql_real_escape_string(htmlspecialchars($v));
		}
		$time = time();
		$data2q = array(
			'name' => $data2db['catename'],
			'cover' => $data2db['cover'],
			'cover_rgb' => $data2db['cover_rgb'],
			'order' => (int) $data2db['order'],
			'status' => (int) $data2db['status'],
			'updatedate' => $time
		);
		$objQueryBuilder = DB::update('photo_catelogs')->set($data2q)->where('id', '=', (int) $data2db['cateid']);
		$objDb = Database::instance('master');
		$arrRes = self::_execQueryBuilder($objQueryBuilder, $objDb);
		JKit::$log->info($objDb->last_query, $arrRes);
	}

	/*获取图片信息*/
	public function get_imgs($data, $offset = 0, $limit = 30, $orderby = 'updatedate,DESC'){
		$objQueryBuilder = DB::select()->from('src_photos');
		/*添加状态条件*/
		if(isset($data['status'])){
			$objQueryBuilder = $objQueryBuilder->where('status', '=', (int) $data['status']);
		}							
		/*添加分类条件*/
		if(isset($data['cateid']) && $data['cateid']) {
			$objQueryBuilder = $objQueryBuilder->and_where('cateid', '=', (int) $data['cateid']);
		}
		/*添加id查找*/
		if(isset($data['id']) && $data['id']) {
			$ids = explode(',', $data['id']);
			$objQueryBuilder = $objQueryBuilder->and_where_open();
			foreach($ids as $id){
				$objQueryBuilder = $objQueryBuilder->or_where('id', '=', mysql_real_escape_string($id));
			}
			$objQueryBuilder = $objQueryBuilder->and_where_close();			
		}
		/*添加查询词条件*/
		if(isset($data['q'])){
			$qkey = array('old_description', 'description', 'title', 'tag', 'sourceurl', 'referer');
			$objQueryBuilder = $objQueryBuilder->and_where_open();
			foreach($qkey as $q){
				$objQueryBuilder = $objQueryBuilder->or_where($q, 'LIKE', '%' . mysql_real_escape_string($data['q']) . '%');
			}
			$objQueryBuilder = $objQueryBuilder->and_where_close();		
		}
		/*获取结果总数*/
		$total = $objQueryBuilder->execute()->count();
		/*添加分页*/
		$objQueryBuilder = $objQueryBuilder
							->limit((int) $limit)
							->offset((int) min($offset, $total));		
		/*添加排序*/
		$order = explode(',', $orderby);
		$objQueryBuilder = call_user_func_array(array($objQueryBuilder, 'order_by'), $order);

		$result = $objQueryBuilder->execute()->as_array();

		JKit::$log->info($objDb->last_query, $arrRes);
		return array(
				'videos' => $result,
				'total' => $total,
				'cates' => $this->get_cates()
			);		
	}

	/*转化url参数成查询方法方式*/
	private function _q2dq($v, $default = 0){
		return isset($this->_qdata[$v]) ? mysql_real_escape_string($this->_qdata[$v]) : $default;
	}

	/*获取未审核图片*/
	public function get_src_imgs($data){
		$data['status'] = 0;
		$this->_qdata = $data;
		return $this->get_imgs($data, $this->_q2dq('offset') , $this->_q2dq('limit', 30), $this->_q2dq('orderby', 'updatedate,DESC'));
	}

	/*获取已审核图片*/
	public function get_added_imgs($data){
		$data['status'] = 1;
		$this->_qdata = $data;
		return $this->get_imgs($data, $this->_q2dq('offset') , $this->_q2dq('limit', 30), $this->_q2dq('orderby', 'updatedate,DESC'));
	}

	/*修改图片信息*/
	public function edit_img($data){
		if (!$data['pid']){
			throw new Exception('没有指定图片id');
			return;
		}
		isset($data['status']) ? $data['status'] = (int) $data['status'] : 0;
		/*如果确认使用图片，上传图片到upyun*/
		if($data['status'] === 1){
			$upedFile = $this->up_img($data['sourceurl']);
			if(!$upedFile){
				throw new Exception('图片上传到upyun未成功');
			} elseif($upedFile['toosmall']){
				throw new Exception('图片宽度小于640px或者高度小于360px');
			}
			$data['sourceurl'] = $upedFile['url'];
			$data['rgb'] = $upedFile['rgb'];
			$data['height'] = $upedFile['height'];
		}
		/*更新信息入库*/
		$data2db = array();
		$data['updatedate'] = time();
		$datakey = array('title','description','cateid','updatedate','status','sourceurl','rgb','height');
		foreach($data as $k => $v){
			if(in_array($k, $datakey)){
				$data2db[$k] = mysql_real_escape_string($v);
			}
		}
		$objQueryBuilder = DB::update('src_photos')->set($data2db)->where('id', '=', $data['pid']);
		$objDb = Database::instance('master');
		$arrRes = self::_execQueryBuilder($objQueryBuilder, $objDb);
		return array(
				'id' => $data['pid'],
				'sourceurl' => $data['sourceurl']
			);
		
		JKit::$log->info($objDb->last_query, $arrRes);		
	}

	/**
	* 添加图片入库
	* arrar $params
	* (
	*   (string | array) 'filename' => //图片地址
	*   (int    | array) 'cateid' => //图片分类
	*   (string | array) 'description' => //图片描述
	*   (string | array) 'sourceurl' => //图片所在页面地址
	* )
	*
	**/
	public function add_img($params){
		if (!$params['sourceurl']){
			throw new Exception('没有图片');
			return;
		}
		$params['createdate'] = time();
		$params['updatedate'] = time();
		$params['filename'] = md5($params['sourceurl']);
		$params['old_description'] = $params['description'];
		if (gettype($params['sourceurl']) == 'array'){
			/*多个图片，如其他项不完全，补全其他项*/
			$l = count($params['sourceurl']);
			$sql_values = array();
			foreach($params as $k => $v){
				if(gettype($params[$k]) != 'array'){
					/*照入库格式翻转数组*/
					for($i = 0; $i < $l; $i++){
						if(!$sql_values[$i]){
							$sql_values[$i] = array($params['sourceurl'][$i]);
						}
						array_push($sql_values[$i], $v);
					}
				}
			}
			print_r($sql_values);
		} else {
			/*单个图片，如其他项是数组，取第一个下标值替换*/
			foreach($params as $k => $v){
				if(gettype($params[$k]) == 'array'){
					$params[$k] = $params[$v][0];
				}
			}
			$sql_values = array(array_values($params));
		}	

		$objQueryBuilder = call_user_func_array(array(DB::insert('src_photos', array_keys($params)), "values"), $sql_values);	
		$objDb = Database::instance('master');
		$arrRes = self::_execQueryBuilder($objQueryBuilder, $objDb);
		JKit::$log->info($objDb->last_query, $arrRes);
	}

	/**
	* 上传文件
	**/
	public function upload(){
		$tmp_dir = '/tmp/weizoo-img-tmp/';
		if($_FILES['img']['error']){
			throw new Exception($_FILES['img']['error']);
		}
		$_file = $tmp_dir . time() . basename($_FILES['img']['name']);
		move_uploaded_file($_FILES['img']['tmp_name'], $_file);
		$upedFile = $this->up_img($_file);
		if(!$upedFile){
			throw new Exception('图片上传到upyun未成功');
		}
		return $upedFile;
	}

	function __call($func, $args){
		$img_py_logic = new Model_Pylogic_Imgs;
		return call_user_func_array(array($img_py_logic, $func), $args);
	}
}