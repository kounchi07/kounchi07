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

GENERAL = ['whoosh', 'whip', 'vine-boom', 'dramatic-boomer', 'record-scratch', 'ding', 'page-turn',
           'bone-crack', 'wilhelm-scream', 'skedaddle', 'switch', 'mouse-click', 'shutter-old']


def main():
    out = sys.argv[1]
    names = sys.argv[2:] or GENERAL
    os.makedirs(out, exist_ok=True)
    for n in names:
        dst = os.path.join(out, f'{n}.wav')
        try:
            with urllib.request.urlopen(f'https://remotion.media/{n}.wav', timeout=30) as r, open(dst, 'wb') as f:
                f.write(r.read())
            print(f'ok   {n}')
        except Exception as e:  # keep going: missing sounds fall back to synthesized ones
            print(f'fail {n}: {e}')


if __name__ == '__main__':
    main()
