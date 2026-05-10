from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/demo/meshbank')
def meshbank_demo():
    return render_template('meshbank-demo.html')
