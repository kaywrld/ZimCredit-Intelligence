"""
passenger_wsgi.py - Phusion Passenger bridge for ZimCredit Intelligence FastAPI
Place this in your cPanel application root directory.

cPanel Setup:
1. Create Python app in cPanel (Python 3.11+)
2. Set Application startup file: passenger_wsgi.py
3. Set Application Entry point: application
4. Copy your .env file to the app root
5. Install requirements: pip install -r requirements.txt
"""
import sys
import os

# Add app directory to path
APPDIR = os.path.dirname(__file__)
sys.path.insert(0, APPDIR)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(APPDIR, ".env"))

# Import the FastAPI app and wrap for WSGI
from asgiref.wsgi import WsgiToAsgi
from app.main import app

# Phusion Passenger expects 'application'
application = WsgiToAsgi(app)
