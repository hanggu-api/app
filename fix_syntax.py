
import os

file_path = r'c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\mobile_app\lib\features\client\service_request_screen_mobile.dart'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Procura o bloco problematico entre 830 e 850
# 841:                   ],
# 842:                 ),
# 843:                 
# 844:                 const SizedBox(height: 32),

new_lines = []
skip_next = False
for i in range(len(lines)):
    line = lines[i]
    if i == 841: # Linha 842 (0-indexed eh 841)
        if '),' in line and 'SizedBox' not in line:
            print(f"Skipping line {i+1}: {line.strip()}")
            continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File updated successfully.")
