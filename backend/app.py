from app import create_app
from dotenv import load_dotenv
import os

# Load environment variables from .env file if present
load_dotenv()

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_ENV') == 'development') 