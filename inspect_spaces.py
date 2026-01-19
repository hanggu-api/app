import sys

file_path = r'c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\mobile_app\lib\features\client\service_request_screen_mobile.dart'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Inspecting lines around 362 (0-indexed 361)
for i in range(355, 375):
    line = lines[i]
    # Replace space with . and tabs with \t for visibility
    vis = line.replace(' ', '.').replace('\t', '\\t').replace('\n', '\\n')
    print(f"{i+1}: |{vis}|")
