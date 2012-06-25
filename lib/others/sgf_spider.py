# -*- coding: utf8 -*-
from wedspider.spider import Spider
import json, urllib, re
import MySQLdb, hashlib
from time import sleep

class SgfSpider(Spider):
	_proceed_wait = 5

	def __init__(self, provider = None, charset = None):
		Spider.__init__(self, provider, charset)
		self.conn = MySQLdb.connect(host='localhost', user='work',passwd='wed@1234') 
		self.conn.select_db('weizoo_weiqi')

	def onparsed(self, runtime, data):
		data = json.loads(data)
		keys = []
		values = ()

		if(data.has_key('sub')):
			for sub in data['sub']:
				self.append(sub)

		if(data.has_key('up_desc')): #更新棋谱说明
			descriptions = []
			for desc in data['up_desc']:
				descriptions.append((desc[1], desc[0]))

			cursor = self.conn.cursor()
			sql = "update t_sgf_info set description  = %s where sid = %s"
			cursor.executemany(sql, tuple(descriptions))
			cursor.close()

		if(data.has_key('sgf_source') and len(data['sgf_source'])):
			keys = ('sid', 'type', 'referer', 'content', 'level', 'status', 'site')

			values_list = [] #基本信息
			info_list = [] #棋局信息

			for (sid, source_url, desc) in data['sgf_source']:

				self.parser.logger.info('parse target : ' + source_url)
				sleep(5)
				
				sgf_content = ''

				for i in range(5):
					try:
						response = urllib.urlopen(source_url)
						sgf_content = response.read()
						break
					except:
						self.parser.logger.info('error, retry...')
						if(i < 4):
							sleep(5)

				if(sgf_content):
					content = sgf_content.decode('gbk')
					_type = data['type'] or 1
					referer = data['referer']
					level = data['level'] or 1
					status = 1
					site = data['site']
				
					values = (sid, _type, referer, content, level, status, site)
					values_list.append(values)

					self.parser.logger.info(content)
					pattern = re.compile('.*?(?:EV\[(.*?)\].*?)?DT\[(.*?)\].*?(?:RE\[(.*?)\].*?)?PB\[(.*?)\].*?PW\[(.*?)\]', re.M|re.S);
					m = pattern.match(content)
					if(m):
						(event, date, result, bplayer, wplayer) = m.groups()
						comments = content.count(']C[') #解说数量
						info = (sid, event, desc, date, result, bplayer, wplayer, comments)
						self.parser.logger.info(info)
						info_list.append(info)

			cursor = self.conn.cursor()
			
			if(values_list):			
				sql = "insert into t_sgf_basic (" + ','.join(list(keys)) + ") values (%s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE sid=VALUES(sid)"
				cursor.executemany(sql, tuple(values_list))
			if(info_list):
				sql = "insert into t_sgf_info (sid, event, description, date, result, bplayer, wplayer, comments) values (%s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE sid=VALUES(sid)"
				cursor.executemany(sql, tuple(info_list))

			cursor.close()

		runtime.alert('done')