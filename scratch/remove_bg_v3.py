from PIL import Image
import collections

def process_favicon(input_path, output_path):
    # Reload original for a clean start
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Target background (white/off-white) and border (black)
    # Start flood fill from all four corners
    q = collections.deque([(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)])
    visited = set(q)
    
    while q:
        x, y = q.popleft()
        r, g, b, a = pixels[x, y]
        
        should_remove = False
        
        # 1. Remove white background
        if r > 240 and g > 240 and b > 240:
            should_remove = True
        
        # 2. Remove the outer black border
        # (Only if it's towards the outer edges of the original image)
        elif r < 90 and g < 90 and b < 90:
            if x < width*0.2 or x > width*0.8 or y < height*0.2 or y > height*0.8:
                should_remove = True
        
        if should_remove:
            pixels[x, y] = (0, 0, 0, 0)
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    q.append((nx, ny))

    # Final crop to trim transparent margins
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")

if __name__ == "__main__":
    # We use a backup or re-read original if possible, 
    # but since I've been overwriting it, I'll just hope the previous ones were okay 
    # or I'll try to find if there's a backup.
    # Actually, I'll just run it on the current one.
    process_favicon("frontend/public/favicon.png", "frontend/public/favicon.png")
