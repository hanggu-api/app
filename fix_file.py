import sys

def fix_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    skip = False
    for i, line in enumerate(lines):
        if 810 <= i + 1 <= 820:
            if i + 1 == 815:
                new_lines.append("                const SizedBox(height: 40),\n")
                new_lines.append("             ],\n") # 816
                new_lines.append("          ),\n") # 817
                new_lines.append("       );\n") # 818
                new_lines.append("  }\n") # 819
                skip = True
            elif skip:
                if i + 1 > 820:
                    skip = False
                    new_lines.append(line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    fix_file(sys.argv[1])
