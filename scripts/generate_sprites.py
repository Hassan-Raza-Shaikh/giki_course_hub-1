import os
import math

out_dir = 'frontend/public'
os.makedirs(out_dir, exist_ok=True)

# Generate Dragon Balls (1 to 7 stars)
def get_stars_svg(count):
    # Stars arranged in a circle or pattern
    # 1 star: center
    # 2 stars: left, right
    # 3 stars: triangle
    # 4 stars: square
    # 5 stars: pentagon
    # 6 stars: hexagon
    # 7 stars: hexagon + center
    stars_str = ""
    def star(cx, cy):
        # 5-pointed star path centered at cx, cy, radius roughly 10
        return f'<polygon points="{cx},{cy-10} {cx+2.5},{cy-2.5} {cx+10},{cy-2.5} {cx+4},{cy+2.5} {cx+6},{cy+10} {cx},{cy+5} {cx-6},{cy+10} {cx-4},{cy+2.5} {cx-10},{cy-2.5} {cx-2.5},{cy-2.5}" fill="#EF4444" />'
    
    positions = []
    if count == 1: positions = [(50, 50)]
    elif count == 2: positions = [(35, 50), (65, 50)]
    elif count == 3: positions = [(50, 35), (35, 60), (65, 60)]
    elif count == 4: positions = [(35, 35), (65, 35), (35, 65), (65, 65)]
    elif count == 5: positions = [(50, 30), (30, 45), (70, 45), (40, 65), (60, 65)]
    elif count == 6: positions = [(50, 25), (25, 45), (75, 45), (35, 70), (65, 70), (50, 85)]
    elif count == 7: positions = [(50, 25), (25, 45), (75, 45), (35, 70), (65, 70), (50, 50), (50, 85)]

    for p in positions:
        stars_str += star(p[0], p[1])
    return stars_str

for i in range(1, 8):
    db_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#F97316"/>
  <circle cx="45" cy="45" r="40" fill="#FB923C"/>
  {get_stars_svg(i)}
  <path d="M 25 25 Q 50 10 75 25 Q 50 20 25 25" fill="#FFFFFF" opacity="0.6"/>
  <circle cx="30" cy="30" r="5" fill="#FFFFFF" opacity="0.8"/>
</svg>"""
    with open(f"{out_dir}/dragonball-{i}.svg", "w") as f:
        f.write(db_svg)

# Spongebob Sky Flowers
colors = ['#38BDF8', '#A7F3D0', '#F472B6', '#C084FC']
for i, c in enumerate(colors):
    flower_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="20" r="15" fill="{c}"/>
  <circle cx="80" cy="40" r="15" fill="{c}"/>
  <circle cx="70" cy="75" r="15" fill="{c}"/>
  <circle cx="30" cy="75" r="15" fill="{c}"/>
  <circle cx="20" cy="40" r="15" fill="{c}"/>
  <circle cx="50" cy="50" r="20" fill="{c}"/>
</svg>"""
    with open(f"{out_dir}/sb-flower-{i+1}.svg", "w") as f:
        f.write(flower_svg)

# Scooby SD Tag
sd_tag_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 50 10 L 90 50 L 50 90 L 10 50 Z" fill="#FDE047" stroke="#EAB308" stroke-width="4"/>
  <circle cx="50" cy="50" r="30" fill="#38BDF8"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#FDE047" text-anchor="middle">SD</text>
  <circle cx="50" cy="15" r="5" fill="#000" opacity="0.5"/>
</svg>"""
with open(f"{out_dir}/scooby-tag.svg", "w") as f:
    f.write(sd_tag_svg)

# Scooby Snack
snack_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="30" width="60" height="40" rx="10" fill="#A16207"/>
  <circle cx="20" cy="30" r="15" fill="#A16207"/>
  <circle cx="80" cy="30" r="15" fill="#A16207"/>
  <circle cx="20" cy="70" r="15" fill="#A16207"/>
  <circle cx="80" cy="70" r="15" fill="#A16207"/>
  <rect x="25" y="35" width="50" height="30" rx="5" fill="#CA8A04"/>
  <circle cx="25" cy="35" r="10" fill="#CA8A04"/>
  <circle cx="75" cy="35" r="10" fill="#CA8A04"/>
  <circle cx="25" cy="65" r="10" fill="#CA8A04"/>
  <circle cx="75" cy="65" r="10" fill="#CA8A04"/>
</svg>"""
with open(f"{out_dir}/scooby-snack.svg", "w") as f:
    f.write(snack_svg)

