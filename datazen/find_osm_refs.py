import re

path = 'frontend/index.html'
with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if re.search(r'nominatim|overpass|tilelayer|preload|prefetch', line, re.IGNORECASE):
            safe = line.strip()[:120].encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"{i}: {safe}")
