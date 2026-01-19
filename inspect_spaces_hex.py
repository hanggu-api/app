import sys

file_path = r'c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\mobile_app\lib\features\client\service_request_screen_mobile.dart'

with open(file_path, 'rb') as f:
    content = f.read()

lines = content.split(b'\n')

# Range around 362 (0-indexed 361)
for i in range(355, 375):
    line = lines[i]
    print(f"{i+1}: {line!r}")
