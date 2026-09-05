import os
from PIL import Image, ImageDraw, ImageFilter

base_dir = r"c:\Users\DI Fight\Documents\Website\mer-donghua\frontend"
source_icon = os.path.join(base_dir, "valknut_1024.png")
res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")

icon_img = Image.open(source_icon).convert("RGBA")

# Mipmap densities and standard launcher icon sizes
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
    # Rounded rect background
    radius = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color)
    
    # Scale emblem
    padding = int(size * 0.16)
    inner_size = size - 2 * padding
    emblem = icon_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(emblem, (padding, padding))
    return canvas

def make_round_launcher(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # Circle background
    draw.ellipse([0, 0, size - 1, size - 1], fill=bg_color)
    
    # Scale emblem
    padding = int(size * 0.18)
    inner_size = size - 2 * padding
    emblem = icon_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(emblem, (padding, padding))
    return canvas

def make_foreground(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Standard adaptive icon foreground uses safe zone of 66/108 (~61%)
    inner_size = int(size * 0.58)
    padding = (size - inner_size) // 2
    emblem = icon_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(emblem, (padding, padding))
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
    print(f"Generated icons for {folder}")

# Splash screen generations
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
    
    logo_size = int(min(w, h) * 0.38)
    emblem = icon_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    canvas.alpha_composite(emblem, (x, y))
    
    canvas.convert("RGB").save(os.path.join(target_dir, "splash.png"), "PNG")
    print(f"Generated splash for {folder}")

print("All Android assets generated successfully!")
