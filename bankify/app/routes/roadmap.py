from flask import Blueprint, render_template, request

roadmap_bp = Blueprint('roadmap', __name__)

@roadmap_bp.route('/roadmap', methods=['GET', 'POST'])
def roadmap():
    if request.method == 'POST':
        # Handle email capture
        email = request.form.get('email')
        print(f"Captured email: {email}") # In a real app, save to db
    return render_template('roadmap.html')
