from PIL import Image

img = Image.open(r'C:\Users\2103\AppData\Local\Temp\opencode\uploads\767364a3-615a-4f12-878f-447bcfce73fa\image.png').convert('RGB')
w, h = img.size
print('Size:', w, h)

# Use a larger grid for more detail
cols, rows = 60, 30
small = img.resize((cols, rows), Image.LANCZOS)
for y in range(rows):
    line = ''
    for x in range(cols):
        p = small.getpixel((x, y))
        # Classify pixel
        if p[1] > 200 and p[0] < 50 and p[2] > 200:
            line += '~'  # cyan water/sky
        elif p[0] < 60 and p[1] < 60 and p[2] < 60:
            line += '#'  # black/dark
        elif p[0] > 200 and p[1] > 200 and p[2] > 200:
            line += '.'  # white/light
        elif p[0] > 150 and p[1] < 100 and p[2] < 100:
            line += 'G'  # red/orange (ground?)
        elif p[1] > 150 and p[0] < 100 and p[2] < 100:
            line += 'H'  # green
        elif p[0] < 100 and p[1] < 100 and p[2] > 150:
            line += 'B'  # blue
        elif p[0] > 80 and p[1] > 40 and p[2] < 60:
            line += 'T'  # brown/tan (platforms?)
        elif p[0] > 100 and p[1] > 100 and p[2] < 60:
            line += 'Y'  # yellow
        elif p[0] > 120 and p[1] > 80 and p[2] > 40:
            line += 'G'  # gold
        else:
            line += ' '
    print(line)
PY