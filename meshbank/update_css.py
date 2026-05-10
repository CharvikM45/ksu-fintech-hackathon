import re

with open('/Users/charvik/ksu-hack/frontend/styles/main.css', 'r') as f:
    css = f.read()

root_block = """:root {
    --bg-primary: #EADFD4;
    --bg-secondary: #F6EBE2;
    --bg-card: #FAF3EC;
    --bg-card-hover: #FDF9F5;
    --bg-glass: rgba(234, 223, 212, 0.95);
    --bg-input: #FFFFFF;

    --accent-primary: #4A3A32;
    --accent-primary-hover: #382A24;
    --accent-primary-glow: rgba(74, 58, 50, 0.15);
    --accent-secondary: #7A5B4C;
    --accent-secondary-glow: rgba(122, 91, 76, 0.15);
    --accent-gradient: linear-gradient(135deg, #4A3A32 0%, #685248 100%);
    --accent-gradient-2: linear-gradient(135deg, #7A5B4C 0%, #906F5F 100%);

    --text-primary: #2B211D;
    --text-secondary: #5E4E45;
    --text-muted: #8F7C73;

    --success: #2A7E43;
    --success-bg: rgba(42, 126, 67, 0.1);
    --warning: #C46700;
    --warning-bg: rgba(196, 103, 0, 0.1);
    --danger: #AB2A2A;
    --danger-bg: rgba(171, 42, 42, 0.1);
    --info: #226EB2;
    --info-bg: rgba(34, 110, 178, 0.1);

    --border: #4A3A32;
    --border-light: rgba(74, 58, 50, 0.2);

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    --radius-full: 9999px;

    /* Professional Neo-Brutalist 3D Shadows */
    --shadow-sm: 2px 2px 0px #4A3A32;
    --shadow-md: 4px 4px 0px #4A3A32;
    --shadow-lg: 6px 6px 0px #4A3A32;
    --shadow-glow: none;

    --transition: all 0.2s ease-out;
}"""

# Replace root variables
css = re.sub(r':root\s*\{[^}]+\}', root_block, css)

# Make global design changes for Neo-Brutalist 3D style
# Borders
css = css.replace('border: 1px solid var(--border);', 'border: 2px solid var(--border); box-shadow: var(--shadow-sm);')
css = css.replace('border: 1px solid var(--border-light);', 'border: 2px solid var(--accent-primary);')
css = css.replace('border-bottom: 1px solid var(--border)', 'border-bottom: 2px solid var(--accent-primary)')

# Buttons
css = css.replace('box-shadow: var(--shadow-md), 0 0 20px var(--accent-primary-glow);', 'box-shadow: var(--shadow-md); border: 2px solid var(--accent-primary);')
css = css.replace('box-shadow: var(--shadow-lg), 0 0 30px var(--accent-primary-glow);', 'box-shadow: var(--shadow-sm); transform: translate(2px, 2px);')

# Balance Card specific
css = css.replace('box-shadow: var(--shadow-lg), var(--shadow-glow);', 'box-shadow: var(--shadow-lg); border: 2px solid var(--accent-primary);')
css = css.replace('color: rgba(255,255,255,0.7);', 'color: rgba(255,255,255,0.9);')
css = css.replace('border: 1px solid rgba(255,255,255,0.25);', 'border: 2px solid rgba(255,255,255,0.8);')

# Inputs
css = css.replace('border-color: var(--accent-primary);\n    box-shadow: 0 0 0 3px var(--accent-primary-glow);', 'border-color: var(--accent-primary);\n    box-shadow: var(--shadow-sm);\n    transform: translate(-2px, -2px);')

# Headers and Navs backgrounds
css = css.replace('background: rgba(10, 14, 23, 0.8);', 'background: rgba(234, 223, 212, 0.95);')
css = css.replace('background: rgba(10, 14, 23, 0.95);', 'background: rgba(234, 223, 212, 0.98);')
css = css.replace('background: rgba(255,255,255,0.1);', 'background: rgba(255,255,255,0.2); color: #fff;')

# QR Codes
css = css.replace('background: #fff;', 'background: #FFF; border: 2px solid var(--accent-primary); box-shadow: var(--shadow-md);')

with open('/Users/charvik/ksu-hack/frontend/styles/main.css', 'w') as f:
    f.write(css)
