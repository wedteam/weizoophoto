<?php defined('SYSPATH') or die('No direct access allowed.');

return array(
	'default' => array( //只读帐号
		'type'       => 'mysql',
		'connection' => array(
			/**
			 * The following options are available for MySQL:
			 *
			 * string   hostname     server hostname, or socket
			 * string   database     database name
			 * string   username     database username
			 * string   password     database password
			 * boolean  persistent   use persistent connections?
			 * array    variables    system variables as "key => value" pairs
			 *
			 * Ports and sockets may be appended to the hostname.
			 */
			'hostname'   => 'localhost:3306',
			'database'   => '******',
			'username'   => '******',
			'password'   => '******',
			'persistent' => FALSE,
		),
		'table_prefix' => 't_',
		'charset'      => 'utf8',
		'caching'      => FALSE,
		'profiling'    => FALSE,
	),
		
	'master' => array( //读写帐号
			'type'       => 'mysql',
			'connection' => array(
					'hostname'   => 'localhost:3306',
					'database'   => '******',
					'username'   => '******',
					'password'   => '******',
					'persistent' => FALSE,
			),
			'table_prefix' => 't_',
			'charset'      => 'utf8',
			'caching'      => FALSE,
			'profiling'    => FALSE,
	),		
);