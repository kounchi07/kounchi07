"""
Download Remotion's free sound effects (https://www.remotion.dev/docs/sfx) into a folder.

  python3 tools/fetch_sfx.py out_dir [name ...]

Needs network access to remotion.media. With no names, fetches the general-purpose set
below. Story build scripts prefer a real recording from this folder when one exists and
fall back to the synthesized sound otherwise.
"""
import os
import sys
import urllib.request

# Only sounds whose page on remotion.dev/docs/sfx states an explicit free license (CC0).
# Sounds Remotion took from myinstants.com are "not explicitly released under a free license" -> not allowed.
VERIFIED = {
    'whoosh': ('Woosh by 1bob, freesound.org/s/831936', 'CC0'),
    'whip': ('SWSH_Badminton Racquet_Recording_01_JW Audio by JW_Audio, freesound.org/s/838766', 'CC0'),
    'page-turn': ('Draw Knife 1 by kenney.nl', 'CC0'),
}
GENERAL = list(VERIFIED)


def main():
    out = sys.argv[1]
    names = sys.argv[2:] or GENERAL
    os.makedirs(out, exist_ok=True)
    for n in names:
        if n not in VERIFIED:
            print(f'skip {n}: license not verified (see CLAUDE.md download rules)')
            continue
        dst = os.path.join(out, f'{n}.wav')
        try:
            req = urllib.request.Request(f'https://remotion.media/{n}.wav', headers={'User-Agent': 'Mozilla/5.0 (rig2d sfx fetch)'})
            with urllib.request.urlopen(req, timeout=30) as r, open(dst, 'wb') as f:
                f.write(r.read())
            import hashlib
            h = hashlib.sha256(open(dst, 'rb').read()).hexdigest()
            print(f'ok   {n}  sha256={h}  source={VERIFIED[n][0]}  license={VERIFIED[n][1]}')
        except Exception as e:  # keep going: missing sounds fall back to synthesized ones
            print(f'fail {n}: {e}')


if __name__ == '__main__':
    main()
