from flask import Blueprint, render_template

team_bp = Blueprint('team', __name__)

@team_bp.route('/team')
def team():
    return render_template('team.html')
