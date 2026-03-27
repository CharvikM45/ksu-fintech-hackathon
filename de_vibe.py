import os
import re

directory = '/Users/charvik/ksu-hack/frontend-react/src'

replacements = [
    (r'font-black', r'font-semibold'),
    (r'border-[24]', r'border border-white/10'),
    (r'border-(t|b|l|r)-[24]', r'border-\1 border-white/10'),
    (r'shadow-\[[^\]]+\]', r'shadow-xl'),
    (r'shadow-premium', r'shadow-2xl'),
    (r'uppercase italic', r''),
    (r'italic', r''),
    (r'uppercase', r''),
    (r'tracking-tighter', r'tracking-tight'),
    (r'tracking-widest', r'tracking-wide'),
    (r'rounded-\[\d+\.?\d*rem\]', r'rounded-2xl'),
    (r'rounded-3xl', r'rounded-2xl'),
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
                
            # Clean up double spaces created by empty replacements
            new_content = re.sub(r' +', ' ', new_content)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
