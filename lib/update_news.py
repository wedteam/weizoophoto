#coding: utf8

from wedspider.spider import Spider
from photo.photo_spider import PhotoSpider

#每日更新
if __name__ == "__main__":
	# QQ 新闻
	queryurl = 'http://news.qq.com/photo.shtml'
	s = PhotoSpider(provider = 'news.qq')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)