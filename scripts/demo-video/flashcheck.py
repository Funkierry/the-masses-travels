# Flash check for a rendered demo: per-frame mean luminance (and of a 4×4 grid of regions), the number of
# reversing brightness swings per second (WCAG 2.3.1 counts a flash as an opposing pair of changes of at
# least 10% luminance), and the largest single-frame jumps.  usage: python flashcheck.py video.mp4
import sys, cv2, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); fps = cap.get(cv2.CAP_PROP_FPS) or 60
lum, grid = [], []
while True:
    ok, f = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(f, (160, 90), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    lum.append(g.mean()); grid.append(g.reshape(4, 22, 4, 40)[:, :22, :, :].mean(axis=(1, 3)) if False else cv2.resize(g, (4, 4), interpolation=cv2.INTER_AREA))
lum = np.array(lum); grid = np.array(grid); n = len(lum)
d = np.diff(lum); dg = np.abs(np.diff(grid, axis=0)).max(axis=(1, 2))
# A flash: a change of >=0.1 followed within a third of a second by an opposite change of >=0.1 (region-wise).
def flashes(series):
    ev = []
    for r in range(4):
        for c in range(4):
            s = series[:, r, c]; i = 0
            while i < len(s) - 1:
                j = i + 1; peak = s[i]
                while j < len(s) and j - i <= fps / 3 and abs(s[j] - s[i]) < .1: j += 1
                if j < len(s) and abs(s[j] - s[i]) >= .1:
                    k = j + 1
                    while k < len(s) and k - j <= fps / 3 and (s[k] - s[j]) * (s[j] - s[i]) > -0.01 and abs(s[k] - s[j]) < .1: k += 1
                    if k < len(s) and (s[k] - s[j]) * (s[j] - s[i]) < 0 and abs(s[k] - s[j]) >= .1: ev.append(j); i = k; continue
                i = j
    return sorted(ev)
ev = flashes(grid)
per_sec = np.bincount((np.array(ev) / fps).astype(int), minlength=int(n / fps) + 1) if ev else np.zeros(1, int)
print(f'frames {n}  seconds {n/fps:.1f}')
print(f'regional flash events {len(ev)}  max per second {per_sec.max()}  seconds over 3: {int((per_sec > 3).sum())}')
top = np.argsort(dg)[::-1][:8]
print('largest single-frame regional jumps:', ', '.join(f'{t/fps:.2f}s {dg[t]:.2f}' for t in sorted(top)))
print(f'frames with a regional jump >= .10: {int((dg >= .1).sum())}   >= .20: {int((dg >= .2).sum())}')
