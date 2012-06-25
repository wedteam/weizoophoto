#coding: utf8

from wedspider.spider import Spider
from photo.photo_spider import PhotoSpider

#每日更新
if __name__ == "__main__":
	#花瓣美女
	import uuid
	#since=xxx 从第几条开始抓
	queryurl = 'http://huaban.com/favorite/beauty/?' + uuid.uuid1().hex[0:8] + '&limit=100&since=3860744' 
	s = PhotoSpider(provider = 'huaban')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(9999)