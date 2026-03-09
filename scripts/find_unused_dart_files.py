#!/usr/bin/env python3
"""Find potentially unused Dart files in `lib/` by scanning import/part statements.

This is a heuristic: it flags Dart files that are not imported/part'd by any other file.
It does not guarantee they are unused (they may be loaded dynamically, referenced via reflection, used as entrypoints, or used by tests).
"""

import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LIB = os.path.join(ROOT, "mobile_app", "lib")

# Adjust this to match the `name:` field in mobile_app/pubspec.yaml.
PACKAGE_NAME = "service_101"

# Regex that matches import/part statements and extracts the path
RE_IMPORT = re.compile(r"^(?:import|part)\s+['\"]([^'\"]+)['\"]")


def normalize_path(path: str, base_dir: str) -> str:
    if path.startswith('dart:'):
        return path

    if path.startswith('package:'):
        # Resolve package imports for this package to the local lib/ directory.
        prefix = f"package:{PACKAGE_NAME}/"
        if path.startswith(prefix):
            return os.path.normpath(os.path.join(LIB, path[len(prefix):]))
        # Keep other package imports as-is.
        return path

    # relative paths
    return os.path.normpath(os.path.join(base_dir, path))


def find_dart_files(root: str):
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f.endswith('.dart'):
                yield os.path.join(dirpath, f)


def main():
    dart_files = set(find_dart_files(LIB))

    referenced = set()

    for f in dart_files:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            for line in fp:
                m = RE_IMPORT.search(line.strip())
                if not m:
                    continue
                imp = m.group(1)
                if imp.startswith('dart:'):
                    continue
                if imp.startswith('package:'):
                    # we can't resolve package imports easily
                    continue
                resolved = normalize_path(imp, os.path.dirname(f))
                if resolved in dart_files:
                    referenced.add(resolved)

    unused = sorted(dart_files - referenced)

    # Exclude typical root entrypoints
    unused = [p for p in unused if not p.endswith('main.dart')]

    print('Total Dart files in lib:', len(dart_files))
    print('Total referenced from other Dart files:', len(referenced))
    print('Potentially unused Dart files (not imported by others):')
    for p in unused:
        print('  ', os.path.relpath(p, ROOT))


if __name__ == '__main__':
    main()
