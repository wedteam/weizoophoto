import os
from jscontext.runtime import JSR

JSR._js_path.append(os.path.join(os.path.dirname(__file__),'js'))