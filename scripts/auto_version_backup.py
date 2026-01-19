
import os
import time
import shutil
import hashlib
from datetime import datetime

# CONFIGURATION
WATCH_DIRS = ['backend', 'mobile_app', 'ai_service']
BACKUP_ROOT = '.local_history'
POLL_INTERVAL = 2  # Seconds
MAX_VERSIONS = 3

# IGNORE PATTERNS (Simple substring check)
IGNORE_DIRS = [
    '.git', 'node_modules', 'build', '.dart_tool', '__pycache__', 
    '.gradle', '.idea', 'dist', 'coverage', '.fvm'
]
IGNORE_EXTENSIONS = ['.pyc', '.log', '.tmp', '.lock']

def is_ignored(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS:
            return True
    
    _, ext = os.path.splitext(path)
    if ext in IGNORE_EXTENSIONS:
        return True
        
    return False

def get_file_hash(filepath):
    try:
        with open(filepath, "rb") as f:
            file_hash = hashlib.md5()
            chunk = f.read(8192)
            while chunk:
                file_hash.update(chunk)
                chunk = f.read(8192)
        return file_hash.hexdigest()
    except Exception:
        return None

def rotate_backups(backup_path):
    """
    Rotates backups:
    file.v2 -> file.v3
    file.v1 -> file.v2
    file    -> file.v1
    """
    # Remove oldest if exists
    v_max = f"{backup_path}.v{MAX_VERSIONS}"
    if os.path.exists(v_max):
        try:
            os.remove(v_max)
        except OSError:
            pass

    # Rotate intermediate versions
    for i in range(MAX_VERSIONS - 1, 0, -1):
        v_curr = f"{backup_path}.v{i}"
        v_next = f"{backup_path}.v{i+1}"
        if os.path.exists(v_curr):
            try:
                shutil.move(v_curr, v_next)
            except OSError:
                pass

    # Move current backup to v1
    if os.path.exists(backup_path):
        v1 = f"{backup_path}.v1"
        try:
            shutil.copy2(backup_path, v1)
            # We don't remove the 'current' backup here because we want 
            # the backup folder to ideally mirror the source structure 
            # plus the version history.
            # Actually, the standard logic is usually:
            # 1. We are about to overwrite 'backup_path' with new content.
            # 2. So we save the OLD 'backup_path' content to 'backup_path.v1'
        except OSError:
            pass

def ensure_backup_dir(backup_file_path):
    dirname = os.path.dirname(backup_file_path)
    if not os.path.exists(dirname):
        os.makedirs(dirname, exist_ok=True)

def main():
    print(f"🚀 Starting Auto-Versioning Backup Service")
    print(f"📂 Watch Dirs: {WATCH_DIRS}")
    print(f"📦 Backup Dir: {BACKUP_ROOT}")
    
    # State: {filepath: (mtime, size)}
    file_state = {}

    # Initial Scan
    print("🔍 Performing initial scan...")
    for d in WATCH_DIRS:
        if not os.path.exists(d):
            print(f"⚠️ Directory not found: {d}")
            continue
            
        for root, _, files in os.walk(d):
            if is_ignored(root):
                continue
                
            for file in files:
                if is_ignored(file):
                    continue
                    
                path = os.path.join(root, file)
                try:
                    stat = os.stat(path)
                    file_state[path] = (stat.st_mtime, stat.st_size)
                except OSError:
                    pass

    print(f"✅ Initial scan complete. Monitoring {len(file_state)} files.")
    print("PRESS START to run (Looping now...)")

    try:
        while True:
            time.sleep(POLL_INTERVAL)
            
            # Rescan
            for d in WATCH_DIRS:
                if not os.path.exists(d):
                    continue

                for root, _, files in os.walk(d):
                    if is_ignored(root):
                        continue

                    for file in files:
                        if is_ignored(file):
                            continue

                        filepath = os.path.join(root, file)
                        try:
                            stat = os.stat(filepath)
                            current_mtime = stat.st_mtime
                            current_size = stat.st_size
                            
                            # Check if new or modified
                            if filepath not in file_state:
                                # New file
                                file_state[filepath] = (current_mtime, current_size)
                                # Optionally backup new files too, but usually we care about edits
                                continue
                            
                            last_mtime, last_size = file_state[filepath]
                            
                            # If modified
                            if current_mtime > last_mtime:
                                print(f"📝 Detected change: {filepath}")
                                
                                # Update clean state immediately to avoid double processing
                                file_state[filepath] = (current_mtime, current_size)
                                
                                # Prepare backup path
                                rel_path = os.path.relpath(filepath, '.')
                                backup_path = os.path.join(BACKUP_ROOT, rel_path)
                                ensure_backup_dir(backup_path)
                                
                                # Check if content actually changed (optional optimization, skipped for speed)
                                # But we DO need to rotate if there was a previous backup
                                if os.path.exists(backup_path):
                                    rotate_backups(backup_path)
                                
                                # Do the backup
                                try:
                                    shutil.copy2(filepath, backup_path)
                                    print(f"   ✅ Backed up to {backup_path}")
                                except Exception as e:
                                    print(f"   ❌ Backup failed: {e}")

                        except OSError:
                            pass
                            
    except KeyboardInterrupt:
        print("\n🛑 Stopping backup service.")

if __name__ == "__main__":
    main()
