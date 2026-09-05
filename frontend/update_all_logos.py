import os
from PIL import Image, ImageDraw

source_path = r"C:\Users\DI Fight\.gemini\antigravity-ide\brain\73f5aa91-c496-4fbb-a6e1-ba52062f26a4\.user_uploaded\media_1787492135093.png"
base_dir = r"c:\Users\DI Fight\Documents\Website\mer-donghua\frontend"
public_dir = os.path.join(base_dir, "public")
res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")

src_img = Image.open(source_path).convert("RGBA")

# 1. Save master high-res logo to public
src_img.save(os.path.join(public_dir, "logo.png"), "PNG")
src_img.save(os.path.join(public_dir, "favicon.png"), "PNG")

# 2. Android Mipmap configs
mipmap_configs = {
    "mipmap-mdpi": {"launcher": 48, "foreground": 108},
    "mipmap-hdpi": {"launcher": 72, "foreground": 162},
    "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
    "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432},
}

bg_color = (10, 10, 15, 255) # #0a0a0f

def make_square_launcher(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color)
    
    # Scale logo with slight margin
    padding = int(size * 0.08)
    inner_size = size - 2 * padding
    logo_resized = src_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo_resized, (padding, padding))
    return canvas

def make_round_launcher(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([0, 0, size - 1, size - 1], fill=bg_color)
    
    padding = int(size * 0.04)
    inner_size = size - 2 * padding
    logo_resized = src_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo_resized, (padding, padding))
    return canvas

def make_foreground(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner_size = int(size * 0.72)
    padding = (size - inner_size) // 2
    logo_resized = src_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo_resized, (padding, padding))
    return canvas

for folder, cfg in mipmap_configs.items():
    target_dir = os.path.join(res_dir, folder)
    os.makedirs(target_dir, exist_ok=True)
    
    l_size = cfg["launcher"]
    fg_size = cfg["foreground"]
    
    sq = make_square_launcher(l_size)
    sq.save(os.path.join(target_dir, "ic_launcher.png"), "PNG")
    
    rd = make_round_launcher(l_size)
    rd.save(os.path.join(target_dir, "ic_launcher_round.png"), "PNG")
    
    fg = make_foreground(fg_size)
    fg.save(os.path.join(target_dir, "ic_launcher_foreground.png"), "PNG")
    print(f"Generated updated icons for {folder}")

# 3. Splash screen generation with the new logo
splash_configs = {
    "drawable": (480, 800),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

for folder, (w, h) in splash_configs.items():
    target_dir = os.path.join(res_dir, folder)
    os.makedirs(target_dir, exist_ok=True)
    
    canvas = Image.new("RGBA", (w, h), bg_color)
    logo_size = int(min(w, h) * 0.45)
    logo_resized = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    canvas.alpha_composite(logo_resized, (x, y))
    
    canvas.convert("RGB").save(os.path.join(target_dir, "splash.png"), "PNG")
    print(f"Generated updated splash for {folder}")

print("All logos and Android assets successfully updated!")
