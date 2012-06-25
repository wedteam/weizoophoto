#coding: utf8

from wedspider.spider import Spider
from wedspider.baidu_spider import BaiduSpider

from photo.photo_spider import PhotoSpider
from time import sleep
import feedparser

#每日更新
if __name__ == "__main__":
	'''
		1 - #其他
		2 - #时尚
		3 - #新闻
		4 - #地理
		5 - #摄影
		6 - #电影
	'''

	#rss的源
	rss_feeds = [
		#电影
		("http://imovie.tuita.com/rss", "tuita", 6),
		("http://jxh1964.tuita.com/rss", "tuita", 6),
		("http://ump-cn.diandian.com/rss", "diandian", 6),
		("http://strangewood.tumblr.com/rss", "tumblr", 6),
		("http://eye-contact.tumblr.com/rss", "tumblr", 6),
		#摄影
		("http://yamijazz.tuita.com/rss", "tuita", 5),
		("http://longmaotx.tuita.com/rss", "tuita", 5),

		("http://timethief.diandian.com/rss", "diandian", 5),
		("http://fotoz.diandian.com/rss", "diandian", 5),
		("http://filmc.diandian.com/rss", "diandian", 5),
		("http://phleksin.diandian.com/rss", "diandian", 5),
		("http://bwphotography.diandian.com/rss", "diandian", 5),
		("http://youthfoto.com/rss", "diandian", 5), # 304跳转，一级域名

		("http://tathata.lofter.com/rss", "lofter", 5),
		("http://janicezz.lofter.com/rss", "lofter", 5),
		("http://nbyazi.lofter.com/rss", "lofter", 5),
		("http://fandi.lofter.com/rss", "lofter", 5),
		("http://waufs.lofter.com/rss", "lofter", 5),
		("http://jacksonmind.lofter.com/rss", "lofter", 5),
		("http://xiaoye.lofter.com/rss", "lofter", 5),
		("http://patata.lofter.com/rss", "lofter", 5),
		("http://tinoleung.lofter.com/rss", "lofter", 5)		
	]

	for feed in rss_feeds:
		feed_url = feed[0]
		provider = feed[1]
		photo_type = feed[2]
		s = PhotoSpider(provider = provider)
		s.parser.assign('photo_type', photo_type)
		s.setUserAgent()
		print feed_url
		for i in range(5):
			r = feedparser.parse(feed_url)
			if(r['entries']):
				break
			else:
				#if(r.has_key('bozo_exception')):
					#print r['bozo_exception'].getMessage()
				print 'rss feed parse error, retry...'
			sleep(2)
		for target in r['entries']:
			s.append(url = target['link'])
			print target['link']
		s.proceed(1000)		
	

	# QQ 新闻
	queryurl = 'http://news.qq.com/photo.shtml'
	s = PhotoSpider(provider = 'news.qq')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)


	# http://www.boston.com/bigpicture/
	queryurl = 'http://www.boston.com/bigpicture'
	s = PhotoSpider(provider = 'boston')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)	



	#花瓣美女
	import uuid
	#since=xxx 从第几条开始抓
	queryurl = 'http://huaban.com/favorite/beauty/?' + uuid.uuid1().hex[0:8] + '&limit=100&since=3860744' 
	s = PhotoSpider(provider = 'huaban')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(9999)
