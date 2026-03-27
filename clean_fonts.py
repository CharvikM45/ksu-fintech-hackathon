import os
import re

directory = '/Users/charvik/ksu-hack/frontend-react/src'

replacements = [
    # Replace tiny font arbitrary sizes with standard Tailwind text utilities
    (r'text-\[(?:8|9|10|11)px\]', r'text-xs text-muted-foreground'),
    (r'text-\[(?:12|13)px\]', r'text-sm'),
    
    # Remove excessive tracking values that make it look "vibe-coded"
    (r'tracking-\[0\.\d+em\]', r''),
    (r'tracking-widest', r''),
    (r'tracking-wide', r''),
    
    # Optional: replace font-black if I missed any (script 1 did it, but just in case)
    (r'font-black', r'font-bold'),
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
                
            # Clean up double spaces
            new_content = re.sub(r' +', ' ', new_content)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Cleaned typography in {filepath}")
