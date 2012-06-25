<?php defined('SYSPATH') or die('No direct script access.');

class Logic extends JKit_Logic {
	/**
	 * @param Database_Query $objBuilder
	 * @param mixed $mixedDb
	 * @throws Exception
	 * @return mixed
	 */
	protected static function _execQueryBuilder($objBuilder, $mixedDb = null, $bolLog = false) {
		if (! is_object($mixedDb)) {
			$mixedDb = Database::instance($mixedDb);
		}
		try {
			$mixedRes = $objBuilder->execute($mixedDb);
			if ($bolLog) {
				JKit::$log->debug($mixedDb->last_query);
			}
		} catch (Exception $e) {
			JKit::$log->warn($e->getMessage(), $mixedDb->last_query);
			print_r($e->getMessage());
			//throw new Exception('系统繁忙，请稍后访问');
		}
		return $mixedRes;
	}

	protected function ex_err($err = 'unknow', $msg = '未知错误'){
		$data = array(
				'err' => $err,
				'msg' => $msg
			);
		throw new Exception(json_encode($data));
	}
}
