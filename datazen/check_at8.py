import re

path = 'frontend/index.html'
matches = []
with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if re.search(r'nominatim|overpass', line, re.IGNORECASE):
            matches.append((i, line.strip()))

if not matches:
    print("SUCCESS: Neither nominatim nor overpass found in frontend/index.html!")
else:
    print(f"FAILED: Found {len(matches)} matches:")
    for m in matches:
        print(f"  Line {m[0]}: {m[1]}")
