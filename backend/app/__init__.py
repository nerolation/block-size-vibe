from flask import Flask
from flask_cors import CORS
import os

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        BEACON_NODE_URL=os.environ.get('BEACON_NODE_URL', 'http://localhost:5052'),
    )

    # Enable CORS for all routes
    CORS(app)

    # Register blueprints
    from app.routes import blocks_bp
    app.register_blueprint(blocks_bp)

    @app.route('/health')
    def health():
        return {'status': 'ok'}
        
    return app 