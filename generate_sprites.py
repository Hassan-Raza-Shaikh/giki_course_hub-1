import sys
from PIL import Image

def make_sprite(pixel_array, colors, filename, scale=4):
    height = len(pixel_array)
    width = max(len(row) for row in pixel_array)
    
    # Pad rows
    padded_array = [row.ljust(width) for row in pixel_array]
    
    img = Image.new('RGBA', (width * scale, height * scale), (0, 0, 0, 0))
    pixels = img.load()
    
    for y, row in enumerate(padded_array):
        for x, char in enumerate(row):
            if char in colors:
                color = colors[char]
                for dy in range(scale):
                    for dx in range(scale):
                        pixels[x * scale + dx, y * scale + dy] = color
                        
    img.save(filename)
    print(f"Generated {filename}")

mario_pixels = [
    "    RRRRR   ",
    "   RRRRRRRRR",
    "   BBBpppkp ",
    "  BpBpppKppp",
    "  BpBBpppKpp",
    "  BBppppKKKK",
    "    ppppppp ",
    "  BBRBB     ",
    " BBBRBBRBBB ",
    "BBBBRRRRBBBB",
    "pp BRpRB pp ",
    "pppRRRRRRppp",
    "pp RRRRRR pp",
    "   BBB  BBB ",
    "  KKK    KKK",
    " KKKK    KKKK"
]
mario_colors = {
    'R': (255, 0, 0, 255),
    'B': (139, 69, 19, 255),
    'p': (255, 204, 153, 255),
    'k': (0, 0, 0, 255),
    'K': (0, 0, 0, 255),
}
make_sprite(mario_pixels, mario_colors, 'frontend/public/mario.png', scale=8)

goomba_pixels = [
    "    BBBB    ",
    "   BBBBBB   ",
    "  BBBBBBBB  ",
    " BpkBBBBkpB ",
    "BpkkpBBpkkpB",
    "pkkkkppkkkkp",
    "pkkkkppkkkkp",
    "BpkkpBBpkkpB",
    " BpkBBBBkpB ",
    "   BBBBBB   ",
    "  KKKKKKKK  ",
    " KKKKKKKKKK ",
    "KKKK    KKKK",
    "KKK      KKK"
]
goomba_colors = {
    'B': (139, 69, 19, 255),
    'p': (255, 204, 153, 255),
    'k': (0, 0, 0, 255),
    'K': (0, 0, 0, 255),
}
make_sprite(goomba_pixels, goomba_colors, 'frontend/public/goomba.png', scale=8)

pacman_pixels = [
    "  YYYYYYYY  ",
    " YYYYYYYYYY ",
    "YYYYYYYYYYYY",
    "YYYYYYYY    ",
    "YYYYYY      ",
    "YYYYYY      ",
    "YYYYYYYY    ",
    "YYYYYYYYYYYY",
    " YYYYYYYYYY ",
    "  YYYYYYYY  "
]
pacman_colors = {'Y': (255, 255, 0, 255)}
make_sprite(pacman_pixels, pacman_colors, 'frontend/public/pacman.png', scale=8)

ghost_pixels = [
    "   RRRRRR   ",
    "  RRRRRRRR  ",
    " RRRRRRRRRR ",
    " RWWWRRRWWWR",
    " RWBWWRRWBWW",
    " RRRRRRRRRR ",
    " RRRRRRRRRR ",
    " RRRRRRRRRR ",
    " RR  RR  RR ",
    " R   R   R  "
]
ghost_colors = {'R': (255, 0, 0, 255), 'W': (255, 255, 255, 255), 'B': (0, 0, 255, 255)}
make_sprite(ghost_pixels, ghost_colors, 'frontend/public/ghost.png', scale=8)

navi_pixels = [
    "    W  W    ",
    "   WW  WW   ",
    "  WW    WW  ",
    "   W BB W   ",
    "    BBBB    ",
    "    BBBB    ",
    "   W BB W   ",
    "  WW    WW  ",
    "   WW  WW   ",
    "    W  W    "
]
navi_colors = {'B': (100, 200, 255, 255), 'W': (255, 255, 255, 200)}
make_sprite(navi_pixels, navi_colors, 'frontend/public/navi.png', scale=8)

snake_head_pixels = [
    "GGGGGGGGGG",
    "GGGBBGGBBG",
    "GGGGGGGGGG",
    "GGGGGGGGGG",
    "GGGGGGGGGG"
]
snake_colors = {'G': (57, 255, 20, 255), 'B': (0, 0, 0, 255)}
make_sprite(snake_head_pixels, snake_colors, 'frontend/public/snake-head.png', scale=6)

snake_body_pixels = [
    "GGGGGGGGGG",
    "GGGGGGGGGG",
    "GGGGGGGGGG",
    "GGGGGGGGGG",
    "GGGGGGGGGG"
]
make_sprite(snake_body_pixels, snake_colors, 'frontend/public/snake-body.png', scale=6)
