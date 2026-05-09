from PIL import Image, ImageDraw

def process_favicon(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # Step 1: Make all pure white pixels transparent
    datas = img.getdata()
    new_data = []
    for item in datas:
        # If it's very close to white, make it transparent
        if item[0] > 245 and item[1] > 245 and item[2] > 245:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    
    # Step 2: Remove the black rounded square border
    # The border is roughly a few pixels thick.
    # We can detect it by looking for black pixels that form a frame.
    # Alternatively, we can just crop the image to the central icons.
    # But a better way is to flood-fill transparency from the edges 
    # to "eat" through the black border if it's connected to the background.
    
    # Let's do a simple approach: make any pixel that is "outside" the central icon transparent.
    # Since the icon is centered, we can use a mask.
    
    # Actually, making all black pixels near the edges transparent might work.
    
    # Let's try to find the bounding box of the colored parts (non-white, non-black)
    # and then keep only that area.
    
    # But for now, let's just do the white-to-transparent and see.
    # I'll also target the black border.
    
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If it's black (the border), and it's near the edges or forming the outer frame
            if r < 50 and g < 50 and b < 50:
                # If it's part of the outer frame (not the book outlines)
                # The books are mostly in the center. 
                # Let's just remove the black border if it's within 10% of the edges.
                if x < width * 0.15 or x > width * 0.85 or y < height * 0.15 or y > height * 0.85:
                    pixels[x, y] = (0, 0, 0, 0)

    img.save(output_path, "PNG")

if __name__ == "__main__":
    process_favicon("frontend/public/favicon.png", "frontend/public/favicon.png")
