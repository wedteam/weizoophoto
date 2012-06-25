# -*- coding: utf8 -*-
import sys, os, MySQLdb, time, urllib, re, gzip
import md5 as imd5

from upyun import UpYun
from StringIO import StringIO

if __name__ == '__main__':

    UPCONFIG = {
        'bucket' : 'weizoo-img',
        'username' : '******',
        'password' : '******'
    }

    def md5(src):
        m1 = imd5.new()
        m1.update(src)
        dest1 = m1.hexdigest()
        return dest1
    sourceurl = 'http://img1.gtimg.com/3/350/35009/3500929_1200x1000_0.jpg'

    u = UpYun(UPCONFIG['bucket'], UPCONFIG['username'], UPCONFIG['password'])
    #按星期建立目录
    _dir = time.strftime('%y%U', time.localtime(time.time()))

    #获取文件后缀
    _r = re.compile('\.\w+$')
    filetype = _r.search(sourceurl).group()
    localfile = '/tmp/weizoo-img-tmp/' + int(time.time()) + filetype

    if not u.mkDir(_dir) :
        print '1'
    #img_file = urllib.urlopen(sourceurl, 'rb')
    os.popen('wget "' + sourceurl + '" -q -O ' + localfile)
    img_file = open(localfile, 'rb')
    bfile = img_file.read()

    
    #源文件md5之后取前16位作为文件名
    filename = md5(bfile)[0:16]

    upfile = _dir + '/' + filename + filetype

    if not u.writeFile(upfile, bfile) :
        print '2'
    print upfile