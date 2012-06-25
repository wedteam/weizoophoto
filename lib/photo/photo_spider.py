# -*- coding: utf8 -*-
from wedspider.spider import Spider

logic_path = '/home/wwwroot/weizoo/application/classes/model/pylogic'
import sys, json

if(not logic_path in sys.path):
	sys.path.append(logic_path)

from imgs import Model_Pylogic_Imgs

class PhotoSpider(Spider):
	def onparsed(self, runtime, data):

		data = json.loads(data)
		img_logic = Model_Pylogic_Imgs()
		
		try:
			if(data.has_key('photos') and data['photos']):
				img_logic.add_imgs(data['photos'])
		except Exception, ex:
			self.logger.error(ex)

		if(data.has_key('sub')):
			for sub in data['sub']:
				self.append(sub)
		
		runtime.alert('done')
		#runtime.alert(data)	