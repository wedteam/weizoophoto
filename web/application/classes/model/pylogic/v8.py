import sys, json

libpath = '/home/work/codesource/photo/lib'
if(libpath not in sys.path):
	sys.path.append(libpath)

from wedspider.parser import HtmlParser

class Model_Pylogic_V8:
	def __init__(self):
		self.parser = HtmlParser()

	def fetch(self, url, script="function(doc, wnd){}"):
		_script = "exports = require('object.h').stringify((" + script + ")(document, window));"
		r = self.parser.parse(url, script=_script)
		if(r):
			r = json.loads(r)
		return r

	def test(self):
		return "test"

if(__name__ == "__main__"):
	script = '''
				function(doc, wnd){
					var title = doc.querySelector('title').innerHTML;
					var subtitles = doc.querySelectorAll('table h3');

					var nextPage = doc.querySelector('a.n:nth-last-child(2)').getAttribute('href');

					var data = {title: title, items:[], next:nextPage};

					for(var i = 0; i < subtitles.length; i++){
						data.items[i] = {subtitles : subtitles[i].innerText}
					}

					return require('object.h').stringify(data);		
				}
			'''
	p = Model_Pylogic_V8()
	print p.fetch("http://www.baidu.com/s?bs=%B0%D9%B6%C8&f=8&rsv_bp=1&rsv_spt=3&wd=DEMO&inputT=1188")