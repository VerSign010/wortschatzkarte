
#### **3. `app/` 目录文件**

##### **`app/__init__.py`**

# File: app/__init__.py (Phoenix Edition)
from flask import Flask
from dotenv import load_dotenv

def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    
    from .views.main import main_bp
    app.register_blueprint(main_bp)
    
    return app