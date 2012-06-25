# -*- coding: utf8 -*-
import sys, MySQLdb, time, urllib, re
import md5 as imd5

from upyun import UpYun

if __name__ == '__main__':
    #u = UpYun('空间名称','操作员用户名','操作员密码')
   
    #a = u.mkDir('testa')
    #print a
    ##a = u.readDir('test/')
    ##for i in a:
    ##    print i.filename
    #u.setApiDomain('g.cn')
    #u.debug = True
    #data = open('/home/yupoo/Desktop/medish.jpg','rb')
    #a = u.writeFile('test d.jpg',data.read())
    #a = u.writeFile('testd.jpg','sdfsdf')
    #print a
    #a = u.deleteFile('test\td.jpg')
    #print a
    #a = u.readDir('')
    #if a:
    #    for i in a:
    #        print i.filename
    #else : 
    #    print a

    UPCONFIG = {
        'bucket' : 'weizoo-img',
        'username' : 'work',
        'password' : '******'
    }

    def md5(src):
        m1 = imd5.new()
        m1.update(src)
        dest1 = m1.hexdigest() 
        return dest1

    sourceurl = 'http://www.google.com/images/nav_logo102.png'

    u = UpYun(UPCONFIG['bucket'], UPCONFIG['username'], UPCONFIG['password'])
    #按星期建立目录
    _dir = time.strftime('%y_%U', time.localtime(time.time()))

    if not (fdir = u.readDir(_dir)) :
        fdir = u.mkDir(_dir)
    if not fdir :
        return False

    img_file = urllib.urlopen(sourceurl, 'rb')
    bfile = img_file.read()
    #获取文件后缀
    _r = re.compile('\.\w+$')
    filetype = _r.search(sourceurl).group()
    #源文件md5之后取前16位作为文件名
    filename = md5(bfile)[0:16]

    upfile = _dir + '/' + filename + filetype
        
    if not u.writeFile(upfile, bfile) :
        return False

    return upfile