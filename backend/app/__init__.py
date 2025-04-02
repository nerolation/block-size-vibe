from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app(test_config=None):
    """Create and configure the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Enable CORS for all routes
    CORS(app)
    
    # Configure the app
    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev-key-change-this'),
        BEACON_NODE_URL=os.getenv('BEACON_NODE_URL', 'https://node.toniwahrstaetter.dev/beacon/'),
        EXECUTION_NODE_URL=os.getenv('EXECUTION_NODE_URL', 'https://node.toniwahrstaetter.dev/execution/'),
        X_API_KEY=os.getenv('X_API_KEY')
    )
    
    # Register blueprints
    from app.routes import blocks_bp
    app.register_blueprint(blocks_bp)
    
    @app.route('/health')
    def health():
        return {'status': 'ok'}
        
    return app 