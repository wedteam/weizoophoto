#coding: utf8

from wedspider.spider import Spider
from others.sgf_spider import SgfSpider
from time import sleep

if __name__ == "__main__":

	'''
	for i in range(250):
		if(i > 220):
			queryurl = 'weiqi.sports.tom.com/hubo/sihuoying_'+str(i+1)+'.htm'
			s = SgfSpider(provider = 'tom_training')
			s.parser.assign('sgf_type', 1) # 1 - 死活题
			s.setUserAgent()
			s.append(url = queryurl)
			s.proceed()
			sleep(5)
	'''

	for i in range(40):
		if(i >= 0):
			if(i < 9):
				prefix = '0'
			else:
				prefix = ''

			queryurl = 'weiqi.sports.tom.com/shoujin/shoujin_0'+prefix+str(i+1)+'.htm'
			s = SgfSpider(provider = 'tom_training')
			s.parser.assign('sgf_type', 2) # 2 - 手筋
			s.setUserAgent()
			s.append(url = queryurl)
			s.proceed()
			sleep(5)

	'''
	queryurl = 'http://weiqi.sports.tom.com/php/listqipu.html'
	s = SgfSpider(provider = 'tom_game2', charset='gbk')
	s.parser.assign('sgf_type', 10) # 10 - 专业比赛
	s.parser.assign('sgf_level', 4) # 4 - 专业级别
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(10000)
	'''

	'''
	queryurl = 'http://weiqi.sports.tom.com/php/listqipu2011.html';
	s = SgfSpider(provider = 'tom_updesc', charset='gbk')
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(10000)
	'''

