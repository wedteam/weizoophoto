#coding: utf-8

from parser import HtmlParser
from jscontext.logger import logger
from jscontext.browser import Webkit
from time import sleep

import urllib2, cookielib
import traceback

class Spider():	
	_proceed_num = 10 #最大抓取页面数
	_proceed_wait = 2 #每个页面抓取之间间隔

	'''
		(parse) provider 是一段js脚本，用来解析页面dom，产生数据
		数据再通过 __callback__ 传给 Spider 的 onparsed 事件
	'''
	_default_provider = None #默认的provider方法
	_default_charset = None

	logger = logger().instance()

	def __init__(self, provider = None, charset = None):
		'''
			target: (url, charset, provider)
				url - 页面url
				provider - 解析页面的 parse provider (js文件)
				charset - 页面编码 
		'''
		self._targets = []
		self._proceeding_cursor = 0
		self.parser = HtmlParser()
		self._default_request_headers = {} #默认的http请求头
		self._default_provider = provider
		self._default_charset = charset

	@staticmethod
	def setupCookies():
		'''
			可开启cookie支持，用于需登录验证等页面的抓取
		'''
		cookie_jar = cookielib.CookieJar()
		opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(cookie_jar))  
		urllib2.install_opener(opener)  

	def setRequestHeader(self, key, value):
		self._default_request_headers[key] = value

	def setUserAgent(self, ua = Webkit().userAgent):
		'''
			请求带上 User-Agent
		'''
		self.setRequestHeader('User-Agent', ua)

	def append(self, url, charset = None , provider = None, headers = {}, body = {}):
		'''
			添加一个新的抓取目标
		'''
		request_headers = {}
		request_headers.update(self._default_request_headers)
		request_headers.update(headers)

		#self.logger.info(request_headers)

		self._targets.append((url, charset or self._default_charset, provider or self._default_provider, request_headers, body))		

	def proceed(self, proceed_num = None, proceed_wait = None):
		
		proceed_num = proceed_num or self._proceed_num
		proceed_wait = proceed_wait or self._proceed_wait

		while(self._proceeding_cursor < len(self._targets) and self._proceeding_cursor < proceed_num):
			try:
				target = self._targets[self._proceeding_cursor]
				self.logger.info('new proceeding... target: ' + target[0])
				(url, charset, provider, headers, body) = target
				script = "require('" + provider + "');"
				self.parser.parse(url, charset, headers, body, script, callback=self.onparsed)
			except Exception, ex:
				self.logger.error(ex)
				self.logger.debug(traceback.format_exc())
			finally:	
				self._proceeding_cursor = self._proceeding_cursor + 1
				sleep(proceed_wait)
		self.logger.info('proceed finished. %d site proceeded', self._proceeding_cursor)

	def reset(self):
		self._proceeding_cursor = 0

	def onparsed(self, runtime, data):
		#override this function to deal with data you parsed by
		runtime.alert(data)			

