#!/usr/bin/env python3
"""生成 PWA 图标（纯 Python，无第三方依赖）：
蓝色渐变圆角背景 + 白色五角星，输出 icon-192.png / icon-512.png
"""
import zlib, struct, math

def make_png(size, pixels):
    """pixels: list of rows, each row list of (r,g,b,a)"""
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    raw = b''
    for row in pixels:
        raw += b'\x00' + b''.join(struct.pack('BBBB', *px) for px in row)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))

def rounded_rect_mask(size, radius, x, y):
    """是否在圆角矩形内（x,y 为像素中心）"""
    r = radius
    if x < r and y < r: return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x >= size - r and y < r: return (x - (size - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y >= size - r: return (x - r) ** 2 + (y - (size - r)) ** 2 <= r * r
    if x >= size - r and y >= size - r: return (x - (size - r)) ** 2 + (y - (size - r)) ** 2 <= r * r
    return True

def in_star(size, x, y):
    """五角星区域判定（中心在 size/2, 外半径 0.42*size）"""
    cx, cy = size / 2, size / 2
    R = size * 0.42
    r = R * 0.5
    dx, dy = x - cx, y - cy
    # 角度归一
    ang = (math.atan2(dy, dx) + math.pi * 2) % (math.pi * 2)
    # 星尖角度: -90° 起, 每 36° 一个尖
    base = math.pi / 2  # 顶部
    # 找到最近的两个尖的角度区间
    # 简化：将角度转换到 [0, 72°) 一个尖-谷周期
    sector = int(ang / (2 * math.pi / 5) + 0.5) % 5  # 最近的尖
    spike_ang = sector * (2 * math.pi / 5) - base
    rel = ang - spike_ang
    # 归一化到 [-36°, 36°]
    if rel > math.pi: rel -= 2 * math.pi
    if rel < -math.pi: rel += 2 * math.pi
    # 谷边角度
    valley_ang = 2 * math.pi / 5 / 2  # 36°
    if abs(rel) <= valley_ang:
        # 半径插值
        t = abs(rel) / valley_ang
        rad = R - (R - r) * t
        return math.hypot(dx, dy) <= rad
    return False

def gen_icon(size):
    radius = size * 0.22
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            if not rounded_rect_mask(size, radius, x, y):
                row.append((0, 0, 0, 0))
                continue
            # 蓝色渐变：上 #3b82f6 下 #1d4ed8
            t = y / size
            r = int(59 + (29 - 59) * t)
            g = int(130 + (78 - 130) * t)
            b = int(246 + (216 - 246) * t)
            if in_star(size, x, y):
                row.append((255, 255, 255, 255))
            else:
                row.append((r, g, b, 255))
        rows.append(row)
    return make_png(size, rows)

import os
outdir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'icons')
os.makedirs(outdir, exist_ok=True)
for size in (192, 512):
    with open(os.path.join(outdir, f'icon-{size}.png'), 'wb') as f:
        f.write(gen_icon(size))
    print(f'icon-{size}.png generated')
