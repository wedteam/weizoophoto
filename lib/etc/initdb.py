#coding: utf8

import MySQLdb

'''
	数据库初始化
'''

DBCONGIF = {
	'host' 	 : 'localhost',
	'port'	 : 3306,
	'user' 	 : '******',
	'passwd' : '******', 
	'dbname' : '******',
}

init_sql = '''
	/* 存储抓取的原始图片数据的表 */
	DROP TABLE IF EXISTS `t_src_photos`;	
	CREATE TABLE IF NOT EXISTS `t_src_photos` (
		`id` int(11) NOT NULL auto_increment, 
		`filename` varchar(64) NOT NULL,		#文件名，默认为 md5(imgdata)，存储路径为 cateid/filename
		`cateid` int(3) NOT NULL default '1',	#默认类别，1为未分类	
		`createdate` int(15) NOT NULL default '0',
		`updatedate` int(15) NOT NULL default '0',
		`expiredate` int(15),
		`sourceurl`	varchar(2048), 				#原始URL
		`referer`	varchar(2048),				#来源页面
		`title` text,					#文件title
		`description` text,   			#文件描述
		`metaid` int(11),						#关联描述图片文件大小、规格等元数据的表的id
		`tag`	text,							#文件的tag
		`status` int(11) NOT NULL default '0',	#状态， 0已入库、1已使用、2已作废、-1已删除
		PRIMARY KEY (`id`),
		UNIQUE KEY `filename` (`filename`),
		KEY `cateid` (`cateid`),
		KEY `status` (`status`)
	);

	/* 图片类别 */
	DROP TABLE IF EXISTS `t_photo_catelogs`;
	CREATE TABLE IF NOT EXISTS `t_photo_catelogs` (
		`id` int(11) NOT NULL auto_increment,
		`name` varchar(256) NOT NULL,
		`description` text,
		`createdate` datetime NOT NULL,
		`updatedate` datetime NOT NULL,
		`expiredate` datetime,
		`status` int(11) NOT NULL default '0',
		PRIMARY KEY (`id`),
		UNIQUE KEY `name` (`name`),
		KEY `status` (`status`)
	);

	/* 图片元素据 */
	DROP TABLE IF EXISTS `t_photo_metadata`;
	CREATE TABLE IF NOT EXISTS `t_photo_metadata` (
		`id` int(11) NOT NULL auto_increment,
		`photoid` int(11) NOT NULL,
		`width` int(11),
		`height` int(11),
		`type` varchar(64),
		`quality` int(11),
		`keywords` text,
		PRIMARY KEY (`id`)
	);
'''

print 'database initialing... \n'
conn = MySQLdb.connect(DBCONGIF['host'], DBCONGIF['user'], DBCONGIF['passwd'], DBCONGIF['dbname'])
conn.query(init_sql)
conn.close()

print 'finished'
