# Scores the benchmark frames: regional flash events and one-frame dropouts (a region that jumps and returns).
import cv2, numpy as np, glob, tempfile, sys
fs = sorted(glob.glob(tempfile.gettempdir() + '/masses-demo/bench/*.jpg'))
g = np.array([cv2.resize(cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY), (8, 8), interpolation=cv2.INTER_AREA) / 255 for f in fs])
d = np.diff(g, axis=0)
drop = ((np.abs(d[:-1]) > .08) & (np.abs(d[1:]) > .08) & (np.sign(d[:-1]) != np.sign(d[1:]))).any(axis=(1, 2)).sum()
print(f'{sys.argv[1] if len(sys.argv)>1 else ""} frames {len(fs)}  one-frame dropouts {int(drop)}  frames with a regional jump >.1: {int((np.abs(d).max(axis=(1,2))>.1).sum())}')
