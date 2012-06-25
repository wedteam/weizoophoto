import os
project_path = os.path.dirname(os.path.abspath(os.path.join(os.getcwd(), __file__)))
os.system(os.path.join(project_path, 'sim-run.sh') + ' ' + project_path);