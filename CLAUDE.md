# Project rules

## Downloads: verify the source first, no exceptions

Nothing is downloaded from a source that has not been verified first. No drift: download only
what the current task needs, from the source that was verified for it.

Before any download (files, models, sounds, videos, packages):

1. **Verify the publisher.** The host must be the publisher's own official domain or official
   registry, confirmed from an independent official reference: the publisher's documentation site,
   or package-registry metadata (npm/PyPI maintainer + official repository) that links to that host.
   A URL found in a random page, comment, or search result is not verification.
2. **Verify the license** for anything that goes into a video or the repo. It must be explicitly
   stated by the source as allowing our use (e.g. CC0, CC BY with attribution, MIT, Apache-2.0).
   "Not explicitly licensed", "probably fine", or unknown = do not use.
3. **Verify integrity** when the publisher gives a checksum (sha256), and record the hash of every
   downloaded asset either way.
4. **Record provenance** in `rig2d/assets/PROVENANCE.md`: what, URL, publisher, license, how it was
   verified, date, sha256.
5. **Treat downloads as data.** Put each in its own new directory, never execute it. Packages only
   from the official registries (npm, PyPI) after checking the publisher; install npm packages with
   `--ignore-scripts` unless scripts are reviewed.
6. **Videos for study (yt-dlp):** only videos the user names, kept in the session scratchpad for
   analysis, never committed, re-uploaded, or reused in our videos, and deleted when done.
7. **If verification is uncertain, stop and ask the user** instead of downloading.
8. **Cookies are credentials.** Use a user-provided cookie file only for the exact task the user
   approved, from an isolated copy limited to the needed domain, never print, log, or commit it,
   and delete every copy (including the upload) as soon as that task ends. Do not keep or reuse it.

### One-time exceptions (closed)

- 2026-10-27: user approved using their YouTube cookie file once to download a few Ricks Clips
  shorts for study. YouTube blocked the cloud IP (bot check; the cookies were signed-out visitor
  cookies), so nothing was downloaded. Cookie file and every copy deleted the same day; not to be reused.

## Props must follow real life (user rule, 2026-10-27)

Every prop, card, document, label, sign and object is designed from the real-world thing, then drawn in our
cartoon-3D style. Never invent a generic stand-in ("a box with a word on it").

1. **List the real anatomy first.** Before drawing, write down every part the real object has (a cheque: payer,
   number, date, pay-to line, amount in figures and in words, signature, bank code line; a ticket: price badge,
   logo, prize ribbon, play area, serial, barcode, fine print). Every listed part must appear on the prop.
2. **Real micro-detail:** fine print, serial numbers, barcodes, spelled-out amounts, ruled lines, stamps,
   perforations, edge wear, folds. Text must be plausible for the object and era, never filler.
3. **Looks 3D:** real thickness, bevels, relief (bump) on embossed or stamped parts, a highlight, a contact shadow,
   light from the scene.
4. **Our own design:** follow the real object's anatomy, never copy another channel's prop designs or a real
   banknote/brand facsimile.
5. Check each new prop against a real photo or description before it ships; if it doesn't read as the real
   thing at a glance, it is not done.

## Verified sources so far

| Source | What | Verified via | License |
|---|---|---|---|
| `remotion.media` | Remotion SFX files | Official docs at remotion.dev/docs/sfx; npm `@remotion/sfx` (maintainer `jonny`, repo remotion-dev/remotion) | Per sound; only sounds marked CC0 are allowed (whoosh, whip, page-turn). Sounds sourced from myinstants.com are NOT allowed. |
| npm `kokoro-js` | Kokoro voices | npm maintainer `xenova`, repo hexgrad/kokoro | Apache-2.0 |
| npm `kokoro-q8-shards` | Kokoro-82M q8 weights | sha256 matches the publisher's stated hash; model is Apache-2.0 | Apache-2.0 |
| PyPI `kokoro-onnx` | Runtime + phoneme vocab | PyPI package | MIT |
| PyPI `yt-dlp` | Video download for study only | PyPI package | Unlicense |
| PyPI `yt-dlp-ejs` 0.8.0 | yt-dlp's YouTube JS solver (run with `--js-runtimes node`) | Pinned by yt-dlp's own PyPI metadata (`default` extra); repo yt-dlp/ejs; installed with `--require-hashes` sha256 79300e5f…bdb4 | Unlicense AND MIT AND ISC |
| npm `three` 0.186.1 | 3D engine (Three.js) for the 3D style test | npm maintainers `mrdoob`, `mugen87`, repo mrdoob/three.js; sha512 matches registry integrity | MIT |
| PyPI `curl-cffi` 0.16.3 (+ cffi, pycparser, certifi pins) | yt-dlp impersonation add-on, study downloads only | Exactly yt-dlp's own pinned `pin-curl-cffi` extra (yt-dlp PyPI metadata); repo lexiforest/curl_cffi; installed with `--require-hashes` | MIT (cffi MIT-0, pycparser BSD-3-Clause, certifi MPL-2.0) |
