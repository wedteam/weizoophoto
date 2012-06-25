# -*- coding: utf-8 -*-

import os, fnmatch, re, errno, shutil, hashlib, string, sys, time, random

ret_file = 'check_result.txt'

def listfiles(root, patterns='*', recurse=1, return_folders=0):        
    pattern_list = patterns.split(';')

    class Bunch:
        def __init__(self, **kwds): self.__dict__.update(kwds)
    arg = Bunch(recurse=recurse, pattern_list=pattern_list,
        return_folders=return_folders, results=[])

    def visit(arg, dirname, files):
        for name in files:
            fullname = os.path.normpath(os.path.join(dirname, name))
            if arg.return_folders or os.path.isfile(fullname):
                for pattern in arg.pattern_list:
                    if fnmatch.fnmatch(name, pattern):
                        arg.results.append(fullname)
                        break
                    
        if not arg.recurse: files[:]=[]

    os.path.walk(root, visit, arg)
    return arg.results

def check_js(path) :
    jsfiles = listfiles(path, '*.js')
    not_allow = (len(sys.argv) >1 and sys.argv[1]) or 'console\.'
    ret_str = ''
    for js in jsfiles:        
        reader = open(js, 'r')
        f = False        
        for i,line in enumerate(reader.xreadlines()) :
            p = re.compile('.*' + not_allow + '.*')
            m = p.match(line)            
            if m :
                if not f:
                    filename_out = "\n" + '='*40 + "\nin file: " + js + ":\n"
                    print filename_out
                    ret_str += filename_out
                out_str = 'line ' + str(i+1) + ':' + line
                print out_str
                ret_str += (out_str + "\n")                
                f = True
        reader.close()
    if len(ret_str) :
        ret2file = open(ret_file, 'w')
        ret2file.write(ret_str)
        ret2file.close()

def main():
    check_js('../')

if __name__ == '__main__':
    main()
