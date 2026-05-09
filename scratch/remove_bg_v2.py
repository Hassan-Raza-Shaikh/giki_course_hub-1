from PIL import Image

def process_favicon(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    # Step 1: Make white transparent
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > 240 and g > 240 and b > 240:
                pixels[x, y] = (255, 255, 255, 0)

    # Step 2: Remove the outer black rounded border
    # We target black pixels in the outer 18% of the image
    margin = int(min(width, height) * 0.18)
    for y in range(height):
        for x in range(width):
            if x < margin or x > width - margin or y < margin or y > height - margin:
                r, g, b, a = pixels[x, y]
                # If it's black (border) or already transparent (background)
                if (r < 80 and g < 80 and b < 80) or a == 0:
                    pixels[x, y] = (0, 0, 0, 0)

    # Step 3: Trim the image to the actual content (autocrop)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    img.save(output_path, "PNG")

if __name__ == "__main__":
    process_favicon("frontend/public/favicon.png", "frontend/public/favicon.png")
