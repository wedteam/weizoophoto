#coding: utf8

from wedspider.spider import Spider
from others.sgf_spider import SgfSpider
from time import sleep

if __name__ == "__main__":

	queryurl = 'weiqi.sports.tom.com/hubo/sihuoying_251.htm'
	s = SgfSpider(provider = 'tom_training')
	s.parser.assign('sgf_type', 1) # 1 - 死活题
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed()
	sleep(5)

	queryurl = 'weiqi.sports.tom.com/shoujin/shoujin_041.htm'
	s = SgfSpider(provider = 'tom_training')
	s.parser.assign('sgf_type', 2) # 2 - 手筋
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed()
	sleep(5)

	queryurl = 'http://weiqi.sports.tom.com/php/listqipu.html'
	s = SgfSpider(provider = 'tom_game', charset='gbk')
	s.parser.assign('sgf_type', 10) # 10 - 专业比赛
	s.parser.assign('sgf_level', 4) # 4 - 专业级别
	s.setUserAgent()
	s.append(url = queryurl)
	s.proceed(1) #只拿最新一页