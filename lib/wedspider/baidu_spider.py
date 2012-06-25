from spider import Spider
import json

# demo spider
class BaiduSpider(Spider):
	_default_provider = 'baidu_provider'

	def onparsed(self, runtime, data):
		#override this function to deal with data you parsed by
		runtime.alert(data)
		data = json.loads(data)
		if(data.has_key('next')):
			self.append('www.baidu.com/' + data['next'])
				  

