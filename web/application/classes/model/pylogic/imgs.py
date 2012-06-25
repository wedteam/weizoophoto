#coding: utf8

import sys, os, MySQLdb, time, urllib, re
import Image, ImageFont, ImageDraw
import md5 as imd5

libpath = '/home/work/codesource/photo/lib/cloud'
if(libpath not in sys.path):
    sys.path.append(libpath)

from upyun import UpYun

TMPFILE_DIR = '/tmp/weizoo-img-tmp/'

DBCONGIF = {
    'host'   : 'localhost',
    'port'   : 3306,
    'user'   : 'work',
    'passwd' : '******', 
    'dbname' : '******',
}
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

class Model_Pylogic_Imgs:
    def __init__(self) :
        self.conn = MySQLdb.connect(DBCONGIF['host'], DBCONGIF['user'], DBCONGIF['passwd'], DBCONGIF['dbname'])

    def get_imgs(self):
        cursor = self.conn.cursor()
        #sql需要按需修改
        cursor.execute("SELECT * FROM t_src_photos")    
        ret = cursor.fetchall()
        cursor.close()
        return ret

    def add_imgs(self, data):
        #入库的字段
        keys = ('filename', 'cateid', 'createdate', 'updatedate', 'expiredate', 'sourceurl', 'referer', 'title', 'old_description')
        #默认值
        default_value = {
            'createdate' : int(time.time()),
            'updatedate' : int(time.time())
        }

        data_li = []
        for img_data in data:
            img = []
            img_data['old_description'] = img_data['description']   
            for item in keys:
                if(not item in img_data):
                    if(item in default_value):
                        img_data[item] = default_value[item]
                    else:
                        img_data[item] = ''

                img.append(img_data[item])

            data_li.append(tuple(img))

        data2db = tuple(data_li)

        cursor = self.conn.cursor()
        sql = "insert into t_src_photos (" + ','.join(list(keys)) + ") values (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE filename=VALUES(filename)"
        cursor.executemany(sql, data2db)

    def rbg_img(self, path):
        #算图片平均色
        color = "#cccccc"
        try:
            image = Image.open(path)
            image = image.convert('RGB')
            point = image.size[0] * image.size[1]
            red = 0
            green = 0
            blue = 0
            for count, (r, g, b) in image.getcolors(point):
                    red += r * count
                    green += g * count
                    blue += b * count

            color = '#%02x%02x%02x' % (red/point, green/point, blue/point)
        except:
            pass

        return color

    def up_img(self, sourceurl) :
        u = UpYun(UPCONFIG['bucket'], UPCONFIG['username'], UPCONFIG['password'])
        #按星期建立目录
        _dir = time.strftime('%y%U', time.localtime(time.time()))
        #获取文件后缀
        _m = re.compile('\.\w+$').search(sourceurl)
        if(_m):
            filetype = _m.group()
        else:
            filetype = '.jpg'
        #下载到本地文件
        localfile = TMPFILE_DIR + str(int(time.time())) + filetype

        if not u.mkDir(_dir) :
            return False

        #img_file = urllib.urlopen(sourceurl, 'rb')
        if(sourceurl[0:4] == 'http'):
            try :
                os.popen('wget "' + sourceurl + '" -q -O ' + localfile)
            except :
                return False
        else:
            localfile = sourceurl
        img_file = open(localfile, 'rb')
        bfile = img_file.read()

        #源文件md5之后取前16位作为文件名
        filename = md5(bfile)[0:16]
        #上传到upyun文件
        upfile = _dir + '/' + filename + filetype
            
        if not u.writeFile(upfile, bfile) :
            os.remove(localfile)
            return False

        rgb = self.rbg_img(localfile)
        _img = Image.open(localfile)
        size = _img.size
        if _img.size[0] < 480 or _img.size[1] < 360:
            return {'toosmall' : True}
        
        height = int(size[1] * (640.0/size[0]))
        ret_data = {'url':upfile,'rgb':rgb, 'height' : height}

        os.remove(localfile)
        return ret_data

    def create_img_2_weibo(self, pid, pic, pic_local, description) :
        #字体文件
        ttf = '/home/work/codesource/fonts/msyh.ttf'
        #每行文字长度
        l = 30
        #upyun图像临时下载到本地
        _m = re.compile('(\.\w+)\!weibo$').search(pic)
        if(_m):
            filetype = _m.groups()[0]
        else:
            filetype = '.jpg'
        _img_tmp = '/tmp/' + str(int(time.time())) + filetype;
        try :
            os.popen('wget "' + pic + '" -q -O ' + _img_tmp)
        except :
            os.remove(_img_tmp)
            return False

        #拆分描述文字，用来换行
        text = []
        while(len(description)):
            l2 = min(len(description), l)
            _description = description[:l]
            if(re.compile('\w').search(description[l2-1])) :
                _re_t = re.compile('(^.*\W)\w+$').search(_description)
                if(_re_t) :
                    _description = _re_t.groups()[0]
                    l2 = min(l, len(_description))

            text.append(_description)
            description = description[l2:]

        text_img_height = len(text) * 26 + 40
        text_img = Image.new("RGB", (440, text_img_height), (0, 0, 0))
        text_img_dr = ImageDraw.Draw(text_img)
        font = ImageFont.truetype(ttf, 14)

        for i in range(len(text)):
            text_img_dr.text((10, 26 * i + 8), text[i], font=font, fill="#ffffff")

        #合成图片
        try :            
            yun_img = Image.open(_img_tmp)
            yun_img_height = yun_img.size[1]

            create_img_height = yun_img_height + text_img_height
            creat_img = Image.new('RGB', (440, create_img_height), (0,0,0))
            creat_img.paste(yun_img.crop((0, 0, 440, yun_img_height)), (0, 0, 440, yun_img_height))
            creat_img.paste(text_img.crop((0, 0, 440, text_img_height)), (0, yun_img_height, 440, create_img_height))
            creat_img.save(pic_local)

            os.remove(_img_tmp)
        except :
            os.remove(_img_tmp)
            return False

        return True