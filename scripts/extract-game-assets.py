"""Extract the activity's map art, decorations, Gracebearer artwork and system BGM from a local
Arknights PC install into public/assets/game/. Run once on the machine that has the game:

    python scripts/extract-game-assets.py "F:/Hypergryph Launcher/games/Arknights"

Requires: pip install UnityPy lameenc pillow
The client stores bundles with a modified LZ4 block format (token nibbles swapped, match offset
big-endian); it is registered below in place of UnityPy's unused LZHAM slot.
"""
import hashlib, io, json, os, sys, wave
import lz4.block
import UnityPy
from PIL import Image
from UnityPy.enums.BundleFile import CompressionFlags
from UnityPy.helpers import CompressionHelper


def decompress_lz4ak(data, size):
    b = bytearray(data); ip = 0; n = len(b)
    while ip < n:
        token = b[ip]; lit = token & 0xF; match = token >> 4
        b[ip] = (lit << 4) | match; ip += 1
        if lit == 0xF:
            while True:
                v = b[ip]; ip += 1; lit += v
                if v != 0xFF: break
        ip += lit
        if ip >= n: break
        b[ip], b[ip + 1] = b[ip + 1], b[ip]; ip += 2
        if match == 0xF:
            while True:
                v = b[ip]; ip += 1
                if v != 0xFF: break
    return lz4.block.decompress(bytes(b), uncompressed_size=size)


CompressionHelper.DECOMPRESSION_MAP[CompressionFlags.LZHAM] = decompress_lz4ak

GAME = sys.argv[1] if len(sys.argv) > 1 else 'F:/Hypergryph Launcher/games/Arknights'
AB = os.path.join(GAME, 'Arknights_Data/StreamingAssets/AB/Windows')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/assets/game')
os.makedirs(OUT, exist_ok=True)
BUNDLES = {
    'retro': 'retro/permanent_sidestory_32_the_masses_travels.ab',
    'preview': 'arts/ui/stage_mappreview_h2_act42side_1_0.ab',
    'preview_ex': 'arts/ui/stage_mappreview_h2_act42side_a_0.ab',
    'bgm': 'audio/sound_beta_2/music/act42side/m_act42side_sys.ab',
}


def textures(key):
    env = UnityPy.load(os.path.join(AB, BUNDLES[key]))
    tex, spr = {}, {}
    for obj in env.objects:
        if obj.type.name == 'Texture2D':
            d = obj.read(); tex[d.m_Name] = d.image.convert('RGBA')
        elif obj.type.name == 'Sprite':
            d = obj.read()
            try: spr[d.m_Name] = d.image.convert('RGBA')
            except Exception: pass
    return tex, spr


def with_alpha(tex, name):
    """Atlases ship colour and alpha as two textures (#0 / #0a)."""
    rgb = tex[name].convert('RGB'); a = tex[name.replace('#0', '#0a').replace('#1', '#1a')].convert('L').resize(rgb.size)
    rgb.putalpha(a); return rgb


manifest = []
def save(name, im, source, rect=None, max_side=2000, quality=86):
    im = im.copy()
    if max(im.size) > max_side: im.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=quality, method=6); data = buf.getvalue()
    path = os.path.join(OUT, f'{name}.webp'); open(path, 'wb').write(data)
    manifest.append({'name': name, 'source': source, 'rect': rect, 'dimensions': list(im.size), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    print(f'{name:22s} {im.size[0]}x{im.size[1]}  {len(data)//1024} KiB')


tex, spr = textures('retro')
src = BUNDLES['retro']
# The three-panel map backdrop, stitched into one strip.
pano = Image.new('RGBA', (3072, 960), (255, 255, 255, 0))
for i in range(3): pano.alpha_composite(spr[f'act42side_zone1_{i + 1}'], (i * 1024, 0))
save('map-pano', pano, src + ' :: act42side_zone1_1..3', max_side=3072, quality=80)
from PIL import ImageFilter
sky = Image.new('RGBA', pano.size, (238, 240, 238, 255)); sky.alpha_composite(pano)
save('map-pano-sky', sky.convert('RGB').resize((768, 240), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6)), src + ' :: act42side_zone1_1..3 (blurred)', max_side=768, quality=70)
save('map-ex', spr['zone_map_act42side_zone2_bg'], src, quality=80)
save('map-s', spr['zone_map_act42side_zone3_bg'], src, quality=80)
for s in ['img_human_dec', 'img_bird', 'img_boss', 'img_car_shadow', 'img_color_dec', 'doc_mosaic', 'doc_bg', 'glow_line', 'img_text_n', 'img_text_t', 'dec_03_03', 'dec_04_03']:
    save(s.replace('img_', '').replace('_', '-'), spr[s], f'{src} :: {s}')

atlases = {
    'z1': with_alpha(tex, 'act42side_map_zone_1_atlas#0'),
    'z2': with_alpha(tex, 'zone_map_act42side_zone2#0'),
    'z3': with_alpha(tex, 'zone_map_act42side_zone3#0'),
    'deco': with_alpha(tex, 'act42side_map_deco_atlas#0'),
}
CROPS = {
    'z1': {'reflect-blue': (46, 36, 218, 234), 'sky-spire': (46, 652, 598, 789), 'arch-blue': (600, 558, 704, 681), 'blade-a': (0, 790, 916, 896), 'blade-b': (20, 898, 932, 996),
           'blade-c': (46, 520, 588, 578), 'blade-d': (46, 413, 578, 472), 'text-column': (932, 168, 1002, 522), 'y-ruler': (932, 584, 1002, 1022),
           'axis-arrow': (0, 18, 46, 792), 'text-shrine': (322, 262, 418, 412)},
    'z2': {'ex-crown': (0, 76, 824, 580), 'arm-hand': (608, 588, 828, 716), 'hand-white': (600, 760, 740, 880), 'star-blue': (600, 884, 744, 1024), 'cracks': (0, 552, 676, 1024)},
    'z3': {'shard-black': (0, 196, 328, 328), 'stroke-white': (336, 228, 532, 276), 'shard-gray': (596, 208, 796, 272), 'arm-a': (328, 280, 456, 424),
           'rays-white': (596, 272, 808, 464), 'figure-joints': (4, 468, 300, 1016), 'hex-set': (304, 468, 488, 652), 'op-label': (316, 664, 572, 772), 'arm-b': (660, 952, 824, 1024)},
    'deco': {'portal-shrine': (8, 28, 132, 176), 'portal-rest': (260, 36, 380, 188), 'portal-god': (4, 188, 128, 344), 'counter-bar': (8, 348, 352, 452)},
}
names = {'z1': 'act42side_map_zone_1_atlas', 'z2': 'zone_map_act42side_zone2', 'z3': 'zone_map_act42side_zone3', 'deco': 'act42side_map_deco_atlas'}
for atlas, crops in CROPS.items():
    for name, rect in crops.items(): save(name, atlases[atlas].crop(rect), f'{src} :: {names[atlas]}', list(rect))

for key, prefix in (('preview', 'act42side_'), ('preview_ex', 'act42side_')):
    _, ps = textures(key)
    for n, im in sorted(ps.items()):
        if n.startswith(prefix): save('stage-' + n.replace(prefix, ''), im, BUNDLES[key], max_side=384, quality=78)

# No character artwork is extracted: the site draws its own plates (crops of character art in the atlases are skipped too).

# System BGM: first 96 seconds, mono 32 kHz MP3 at 96 kbit/s, enough for an ambient loop.
import lameenc
env = UnityPy.load(os.path.join(AB, BUNDLES['bgm']))
for obj in env.objects:
    if obj.type.name == 'AudioClip':
        name, data = next(iter(obj.read().samples.items()))
        w = wave.open(io.BytesIO(data)); ch, sw, rate = w.getnchannels(), w.getsampwidth(), w.getframerate()
        frames = w.readframes(min(w.getnframes(), rate * 96))
        import array
        pcm = array.array('h', frames)
        mono = array.array('h', ((pcm[i] + pcm[i + 1]) // 2 for i in range(0, len(pcm) - 1, 2))) if ch == 2 else pcm
        enc = lameenc.Encoder(); enc.set_bit_rate(96); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
        mp3 = enc.encode(mono.tobytes()) + enc.flush()
        open(os.path.join(OUT, 'bgm-sys.mp3'), 'wb').write(mp3)
        manifest.append({'name': 'bgm-sys', 'source': f"{BUNDLES['bgm']} :: {name}", 'processing': 'first 96 s, mono, 96 kbit/s MP3', 'bytes': len(mp3), 'sha256': hashlib.sha256(mp3).hexdigest()})
        print('bgm-sys.mp3', len(mp3) // 1024, 'KiB'); break

json.dump({'game_install': 'local Arknights PC client (Hypergryph Launcher)', 'rights': 'Artwork and music belong to Hypergryph. Extracted from the owner\'s local client for this fan study only; not for redistribution.', 'assets': manifest},
          open(os.path.join(OUT, 'game-assets.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(manifest), 'assets')
