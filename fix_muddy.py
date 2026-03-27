import os
import re

directory = '/Users/charvik/ksu-hack/frontend-react/src'

replacements = [
    # Elevate text contrast
    (r'text-primary/10', r'text-white/20'),
    (r'text-primary/20', r'text-white/40'),
    (r'text-primary/30', r'text-white/50'),
    (r'text-primary/40', r'text-white/60'),
    (r'text-primary/60', r'text-white/70'),
    (r'text-primary', r'text-white'),
    
    # Background and borders should use neutral white scales instead of muddy cream
    (r'bg-primary/5\b', r'bg-white/5'),
    (r'bg-primary/10\b', r'bg-white/10'),
    (r'bg-primary/20\b', r'bg-white/10'),
    (r'border-primary/10\b', r'border-white/10'),
    (r'border-primary/20\b', r'border-white/20'),
    (r'shadow-glow-mocha', r'shadow-lg'),
    
    # Selection and active states
    (r'selection:bg-primary/30', r'selection:bg-white/20'),
    (r'selection:text-primary', r'selection:text-white'),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = content
            for pattern, repl in replacements:
                new_content = re.sub(pattern, repl, new_content)
                
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Enhanced contrast in {filepath}")
