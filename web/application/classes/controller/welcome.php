<?php defined('SYSPATH') or die('No direct script access.');

class Controller_Welcome extends Controller {

	public function action_index()
	{
		//$this->request->forward('guide');
		$this->response->body('hello, world!');
	}

} // End Welcome
