# Asset provenance

Every downloaded asset, how its source was verified, and its license (see ../../CLAUDE.md).

| Asset | URL | Original source | License | Verified via | Date | sha256 |
|---|---|---|---|---|---|---|
| whoosh.wav | https://remotion.media/whoosh.wav | "Woosh" by 1bob, freesound.org/s/831936 | CC0 | remotion.dev/docs/sfx/whoosh (official docs) + npm @remotion/sfx (remotion-dev/remotion) | 2026-10-27 | d98f010fa5f03fd3f4f77418f8ba6a962d36e63357265772771c4ac69c1a63a7 |
| whip.wav | https://remotion.media/whip.wav | "SWSH_Badminton Racquet_Recording_01_JW Audio" by JW_Audio, freesound.org/s/838766 | CC0 | remotion.dev/docs/sfx/whip | 2026-10-27 | 8713e68578c7f579bdfc24ff77fd3e3eefc1a9b5d1232a63c10800b81d0ead5f |
| page-turn.wav | https://remotion.media/page-turn.wav | "Draw Knife 1" by kenney.nl | CC0 | remotion.dev/docs/sfx/page-turn | 2026-10-27 | 72762a9dafd5f9dd4bdf365f373519a35a8786ae975de4e2bc339fcdcf6b5f6d |
| model_quantized.onnx (Kokoro-82M q8) | npm kokoro-q8-shards@1.0.0 | onnx-community/Kokoro-82M-v1.0-ONNX | Apache-2.0 | sha256 matches the hash stated by the package publisher | 2026-10-26 | fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478 |
| Kokoro voices (*.bin) | npm kokoro-js@1.2.1 | hexgrad/kokoro | Apache-2.0 | npm maintainer xenova, repo hexgrad/kokoro | 2026-10-26 | (package integrity checked by npm) |

Rejected (license not verified): Remotion's vine-boom, dramatic-boomer, record-scratch, ding, bruh and other
meme sounds. Their docs say they come from myinstants.com and are "not explicitly released under a free license".
