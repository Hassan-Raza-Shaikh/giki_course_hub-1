import os
import re
import emoji

def find_emojis_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        # Find emojis in the line
        emojis_found = [c for c in line if c in emoji.EMOJI_DATA]
        if emojis_found:
            print(f"{filepath}:{i+1}: {line.strip()} (Emojis: {''.join(emojis_found)})")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css')):
            find_emojis_in_file(os.path.join(root, file))
