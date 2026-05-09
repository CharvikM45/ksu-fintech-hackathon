from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # Import blueprints
    from .routes.main import main_bp
    from .routes.product import product_bp
    from .routes.team import team_bp
    from .routes.roadmap import roadmap_bp
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(roadmap_bp)
    
    return app
