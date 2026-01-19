import os
import subprocess

# Ensure pillow is installed for conversion
try:
    from PIL import Image as PILImage
except ImportError:
    subprocess.check_call(["python", "-m", "pip", "install", "Pillow"])
    from PIL import Image as PILImage

assets_dir = r"c:\Users\thela\ .gemini\antigravity\scratch\projeto_figma_app\mobile_app\assets\images\slid".replace(" ", "")
# Real path check
assets_dir = r"c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\mobile_app\assets\images\slid"

if not os.path.exists(assets_dir):
    print(f"Directory not found: {assets_dir}")
    exit(1)

files = os.listdir(assets_dir)
image_count = 1

for f in files:
    full_path = os.path.join(assets_dir, f)
    if os.path.isdir(full_path):
        continue
    
    ext = os.path.splitext(f)[1].lower()
    
    # Video renaming
    if ext == ".mp4":
        new_name = "ad_video.mp4"
        os.rename(full_path, os.path.join(assets_dir, new_name))
        print(f"Renamed video: {f} -> {new_name}")
        continue
    
    # Image renaming and conversion (especially AVIF to PNG)
    if ext in [".avif", ".png", ".jpg", ".jpeg"]:
        new_name = f"slide{image_count}.png"
        target_path = os.path.join(assets_dir, new_name)
        
        try:
            with PILImage.open(full_path) as img:
                img.save(target_path, "PNG")
            
            # Remove old file if it wasn't already slideX.png
            if f != new_name:
                os.remove(full_path)
            
            print(f"Converted/Renamed image: {f} -> {new_name}")
            image_count += 1
        except Exception as e:
            print(f"Error processing {f}: {e}")

print("Done processing assets.")
