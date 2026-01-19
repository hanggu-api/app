def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in '([{':
                stack.append((char, i + 1))
            elif char in ')]}':
                if not stack:
                    print(f"Extra closing '{char}' at line {i+1}")
                    continue
                last_char, last_line = stack.pop()
                if (last_char == '(' and char != ')') or \
                   (last_char == '[' and char != ']') or \
                   (last_char == '{' and char != '}'):
                    print(f"Mismatch: '{last_char}' from line {last_line} closed by '{char}' at line {i+1}")
    
    while stack:
        char, line = stack.pop()
        print(f"Unclosed '{char}' from line {line}")

if __name__ == "__main__":
    import sys
    check_balance(sys.argv[1])