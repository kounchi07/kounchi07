# Asset provenance

Every downloaded asset, how its source was verified, and its license (see ../../CLAUDE.md).

| Asset | URL | Original source | License | Verified via | Date | sha256 |
|---|---|---|---|---|---|---|
| whoosh.wav | https://remotion.media/whoosh.wav | "Woosh" by 1bob, freesound.org/s/831936 | CC0 | remotion.dev/docs/sfx/whoosh (official docs) + npm @remotion/sfx (remotion-dev/remotion) | 2026-10-27 | d98f010fa5f03fd3f4f77418f8ba6a962d36e63357265772771c4ac69c1a63a7 |
| whip.wav | https://remotion.media/whip.wav | "SWSH_Badminton Racquet_Recording_01_JW Audio" by JW_Audio, freesound.org/s/838766 | CC0 | remotion.dev/docs/sfx/whip | 2026-10-27 | 8713e68578c7f579bdfc24ff77fd3e3eefc1a9b5d1232a63c10800b81d0ead5f |
| page-turn.wav | https://remotion.media/page-turn.wav | "Draw Knife 1" by kenney.nl | CC0 | remotion.dev/docs/sfx/page-turn | 2026-10-27 | 72762a9dafd5f9dd4bdf365f373519a35a8786ae975de4e2bc339fcdcf6b5f6d |
| model_quantized.onnx (Kokoro-82M q8) | npm kokoro-q8-shards@1.0.0 | onnx-community/Kokoro-82M-v1.0-ONNX | Apache-2.0 | sha256 matches the hash stated by the package publisher | 2026-10-26 | fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478 |
| faster-whisper (speech-to-text, study only) | PyPI faster-whisper==1.2.1 | SYSTRAN/faster-whisper | MIT | PyPI homepage = official SYSTRAN repo | 2026-10-27 | (pip) |
| faster-whisper-small model | huggingface.co/Systran/faster-whisper-small | SYSTRAN (official HF org) | MIT | HF author = Systran, linked from the package | 2026-10-27 | (HF cache) |
| Kokoro voices (*.bin) | npm kokoro-js@1.2.1 | hexgrad/kokoro | Apache-2.0 | npm maintainer xenova, repo hexgrad/kokoro | 2026-10-26 | (package integrity checked by npm) |

Rejected (license not verified): Remotion's vine-boom, dramatic-boomer, record-scratch, ding, bruh and other
meme sounds. Their docs say they come from myinstants.com and are "not explicitly released under a free license".

## three.js 0.186.1 (npm `three`) — 2026-10-27
- What: 3D engine for the full-3D style test (`rig2d/3d/`), installed into `rig2d/3d/node_modules` (gitignored).
- URL: https://registry.npmjs.org/three/-/three-0.186.1.tgz
- Publisher: npm maintainers `mrdoob` (info@mrdoob.com) and `mugen87`, repository github.com/mrdoob/three.js, homepage threejs.org.
- License: MIT.
- Verified: npm registry metadata (maintainers + official repo); tarball sha512 matches the registry `dist.integrity`; sha1 matches `dist.shasum` 6d50f70c2c437f844179bbb56d6f5b774e1ca38a. Installed with `--ignore-scripts`.
- sha256 (tarball): 8cd068708ea44f2c73c944b1cead2ba2f0d5c15c8fc194e5700f4e4f4a033fe7

## Reference photos: Woodside Store interior (HABS CA-2146) — 2026-10-27
- What: 12 HABS photos of the Woodside Store (Woodside, CA, 1854), used ONLY as visual reference for modeling the 3D
  general store set. Kept in the session scratchpad, not committed, not shown in any video.
- URL: https://www.loc.gov/item/ca0858/ (files from tile.loc.gov/storage-services/service/pnp/habshaer/ca/ca0800/ca0858/)
- Publisher: Library of Congress, Prints and Photographs Division (official loc.gov domain).
- License: "No known restrictions on images made by the U.S. Government" (HABS, loc.gov/rr/print/res/114_habs.html).
- Verified: item record on loc.gov (rights advisory + repository fields).
- sha256 of the main reference (photo 9, interior with counter and coffee grinders, 017834pv.jpg): e6fb657f1e91eb31ecb58a2d56b2195641195b22c8a905b04e0786d5c113875f
