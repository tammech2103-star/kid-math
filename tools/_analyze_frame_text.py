from PIL import Image

# Analyze frame_01 which has visible character + text
img = Image.open(r'D:\Kid Math\Asset\_sprite_frames\frame_01_r0_c1.png').convert('RGB')
w, h = img.size
print('Frame size:', w, h)

# Find rows that have non-gray pixels
for y in range(h):
    row_pixels = [img.getpixel((x, y)) for x in range(w)]
    non_gray = [p for p in row_pixels if not (150 < p[0] < 180 and 150 < p[1] < 180 and 150 < p[2] < 180)]
    if len(non_gray) > 0:
        # Check if this row is mostly text (small scattered pixels) or character (larger blocks)
        print('Row %d: %d non-gray pixels' % (y, len(non_gray)))
PY