# Bundled 3D dance

RobotExpressive by Tomás Laulhé (Quaternius), with the modifications credited in
RobotExpressive.LICENSE.md. License: CC0 1.0. Official source:
https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf/RobotExpressive

Downloaded original GLB SHA-256:
047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319

The runtime copy retains only the original **Dance** animation. Other animation
clips are removed from the GLB's animation list. No video, audio, account or remote
request is used at runtime. Seven tempo/start-phase variants reuse this same
licensed full-body clip; they are not seven separately authored clips.

Three.js 0.170.0: MIT; see three.LICENSE.txt. The committed IIFE embeds the GLB as a
data URL and includes Three.js and GLTFLoader. Rebuild with `npm ci` and
`npm run build:dance` using the pinned package-lock.json; normal site builds do not
need npm installation. The CSS toy-robot fallback is original application code.
