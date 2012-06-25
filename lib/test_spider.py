#coding: utf8

from wedspider.spider import Spider
from wedspider.baidu_spider import BaiduSpider

from photo.photo_spider import PhotoSpider

if __name__ == "__main__":

	'''
	#测试用
	queryurl = 'http://www.baidu.com/s?wd=Demo&rsv_bp=0&rsv_spt=3&inputT=884'
	s = BaiduSpider()
	s.append(queryurl)
	s.proceed()
	'''

	'''
	queryurl = 'http://news.ifeng.com/photo/'
	s = PhotoSpider(provider = 'news.ifeng')
	s.append(url = queryurl)
	s.proceed()
	'''

	'''
	queryurl = 'http://news.163.com/special/000113C4/weekinpicture.html'
	s = PhotoSpider(provider = 'news.163')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed()
	'''
	
	'''
	queryurl = 'http://gb.cri.cn/photo/'
	s = PhotoSpider(provider = 'gb.cri.cn')
	s.append(url = queryurl)
	s.proceed()
	'''
	###################### 精选 #########################################
	
	'''
	queryurl = 'http://news.qq.com/photo.shtml'
	s = PhotoSpider(provider = 'news.qq')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(100)
	'''


	'''
	#国家地理
	queryurl = 'http://photography.nationalgeographic.com/photography/photo-of-the-day/'
	s = PhotoSpider(provider = 'photography')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)
	'''

	'''
	#花瓣美女
	import uuid
	#since=xxx 从第几条开始抓
	queryurl = 'http://huaban.com/favorite/beauty/?' + uuid.uuid1().hex[0:8] + '&limit=100&since=1737603' 
	s = PhotoSpider(provider = 'huaban')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(100)
	'''

	'''
	#光影 - rss
	#1-推他源
	import feedparser
	rss_list = ["http://yamijazz.tuita.com/rss", "http://longmaotx.tuita.com/rss"]
	s = PhotoSpider(provider = 'tuita')
	s.setUserAgent()
	for rss in rss_list:
		r = feedparser.parse(rss)
		for target in r['entries']:
			s.append(url = target['link'])
	s.proceed(100)
	'''
	'''
	#2-点点源
	rss_list = ["http://timethief.diandian.com/rss",
				"http://fotoz.diandian.com/rss",
				"http://filmc.diandian.com/rss",
				"http://phleksin.diandian.com/rss",
				"http://bwphotography.diandian.com/rss",
				"http://youthfoto.diandian.com/rss"]
	s = PhotoSpider(provider = 'diandian')
	s.setUserAgent()
	for rss in rss_list:
		r = feedparser.parse(rss)
		for target in r['entries']:
			s.append(url = target['link'])
	s.proceed(100)
	'''

	'''
	#3-lofter源
	rss_list = ["http://tathata.lofter.com/rss",
				"http://janicezz.lofter.com/rss",
				"http://nbyazi.lofter.com/rss",
				"http://fandi.lofter.com/rss",
				"http://waufs.lofter.com/rss",
				"http://jacksonmind.lofter.com/rss",
				"http://xiaoye.lofter.com/rss",
				"http://patata.lofter.com/rss",
				"http://tinoleung.lofter.com/rss"]
	s = PhotoSpider(provider = 'lofter')
	s.setUserAgent()
	for rss in rss_list:
		r = feedparser.parse(rss)
		for target in r['entries']:
			#print target['link']
			s.append(url = target['link'])
	s.proceed(1000)
	'''

	#推他存档
	#queryurl = 'http://imovie.tuita.com/archive'  #6 - 电影
	queryurl = 'http://jxh1964.tuita.com/archive' #6 - 电影
	#queryurl = 'http://yamijazz.tuita.com/archive' #5 - 摄影
	#queryurl = 'http://longmaotx.tuita.com/archive' #5 - 摄影
	s = PhotoSpider(provider = 'tuita_archive')
	s.parser.assign('photo_type', 6)
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)

	'''
	#点点存档 - 发现的接口
	#queryurl = 'http://ump-cn.diandian.com/archive?lite=1&month=201203'
	#queryurl = 'http://allposter.diandian.com/archive?lite=1&month=201201'
	queryurl = 'http://movielife.diandian.com/archive?lite=1&month=201102'
	s = PhotoSpider(provider = 'diandian_archive')
	s.parser.assign('photo_type', 6) #movie
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)
	'''

	
	'''
	#tumblr存档
	#queryurl = 'http://strangewood.tumblr.com/archive';
	queryurl = 'http://eye-contact.tumblr.com/archive';
	s = PhotoSpider(provider = 'tumblr_archive')
	s.parser.assign('photo_type', 6)
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)
	'''

	'''
	#lofter存档
	#queryurl = 'http://tathata.lofter.com/view';
	#queryurl = 'http://janicezz.lofter.com/view';
	#queryurl = 'http://nbyazi.lofter.com/view';
	#queryurl = 'http://fandi.lofter.com/view';
	#queryurl = 'http://waufs.lofter.com/view';
	#queryurl = 'http://jacksonmind.lofter.com/view';
	#queryurl = 'http://xiaoye.lofter.com/view';
	#queryurl = 'http://patata.lofter.com/view';
	queryurl = 'http://tinoleung.lofter.com/view';	
	s = PhotoSpider(provider = 'lofter_archive')
	s.parser.assign('photo_type', 5)	#摄影
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1000)
	'''	
	