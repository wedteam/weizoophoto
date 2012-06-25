#coding: utf-8

import sys,os
from jscontext.runtime import JSR
from jscontext.logger import logger
from time import sleep

class HtmlParser():
	logger = logger().instance()
	_data = {}

	def assign(self, key, value):
		self._data.update({key:value})


	'''
		script: 抓取某个url路径分析页面

			//data provider - demo_provider.js
			require("parser").on('load', function(){
				//data provider
			});
	'''
	def parse(self, url, charset=None, headers={}, body={}, script=None, callback=None, retrys = 5):
		rt = None

		for i in range(retrys):
			try:
				rt = JSR(url, charset=charset, headers=headers, body=body)
				for i in self._data:
					rt.assign(i, self._data[i])
				break
			except Exception, ex:
				self.logger.error(ex)
				if(i < retrys - 1 ):
					sleep(5)

		if(rt):
			if(callback): #异步方式，支持onload事件
				rt.__callback__ = lambda data=None: callback(rt, data)
				parser = rt.execute(rt.require, ['parser'])
				if(script):
					rt.execute(script)
				return rt.execute(parser.fire, ['load'])
			else:
				return rt.execute(script) if script else True
		else:
			raise Exception, 'parse url error : ' + url
