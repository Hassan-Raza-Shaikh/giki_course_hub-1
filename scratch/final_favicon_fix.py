from PIL import Image
import collections
import os

def final_process(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Flood fill from the corners to make the background transparent
    # We use a tolerance because the "pure white" might have slight variations near the edges
    q = collections.deque([(0,0), (width-1, 0), (0, height-1), (width-1, height-1)])
    visited = set(q)
    
    bg_color = pixels[0,0] # Usually (255, 255, 255, 255)
    
    while q:
        x, y = q.popleft()
        r, g, b, a = pixels[x, y]
        
        # If it's the background color (white)
        if r > 250 and g > 250 and b > 250:
            pixels[x, y] = (0, 0, 0, 0)
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    q.append((nx, ny))

    # Crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    img.save(output_path, "PNG")

if __name__ == "__main__":
    # Path to the generated image with white background
    # Note: I need to use the actual path from the previous tool output
    # final_favicon_white_bg_1778339599147.png
    input_img = "/Users/hassan/.gemini/antigravity/brain/3a2f5966-893f-46a0-9d48-1a9811e4214e/favicon_white_bg_1778339599147.png"
    output_img = "frontend/public/favicon.png"
    final_process(input_img, output_img)
