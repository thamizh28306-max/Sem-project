import re

path = 'frontend/index.html'
with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'fetch(' in line or 'http://' in line or 'https://' in line:
            safe = line.strip()[:140].encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"{i}: {safe}")
