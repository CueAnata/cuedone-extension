# CueDone audio assets

## Final-task sounds

These files are bundled with the extension and require no runtime network access. All four source recordings are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The bundled MP3 files are Freesound's preview transcodes of those recordings and are included unchanged.

- **Yay!** — `final-yay.mp3`, from [Group_Yay_Cheer.wav](https://freesound.org/people/Stevedrums/sounds/393402/) by Stevedrums; source duration 1.91s; SHA-256 `0ae92efea5724ce221063e7785f0067443b2d844922961ad8931ba2766a680a9`.
- **Applause** — `final-applause.mp3`, from [Aplause - short burst.wav](https://freesound.org/people/soundmary/sounds/117592/) by soundmary; source duration 4.74s; SHA-256 `6246082e4722e0eaa9b3cfeefdec86ed0effc20afe6da3e744cff4dd54db66f3`.
- **Trumpet fanfare** — `final-trumpet-fanfare.mp3`, from [Clean and Pompous Fanfare Trumpet.mp3](https://freesound.org/people/joepayne/sounds/413203/) by joepayne; source duration 4.06s; SHA-256 `d9ac11b54eb00bfeecbcaba90051940c92a0dfa9f9d915373e3759962bf1cd82`.
- **Hurrah!** — `final-hurrah.mp3`, from [Hooray.mp3](https://freesound.org/people/DeusVultInfidel/sounds/448492/) by DeusVultInfidel; source duration 2.76s; SHA-256 `1b99fd8bd1353aee4de95274b869795f127eff68f78f73a599ae6455d86b4f23`.

`final-yay.mp3` and `final-hurrah.mp3` contain recognizable spoken cheers. The Hurrah choice uses the synonymous spoken cheer “Hooray.”

The default **Current tone** is CueDone's existing procedurally generated three-note final chime, so it has no external asset or license dependency.

## Individual-task sounds

Bubble Pop, Soft Click, and Wood Tap are original CueDone assets generated specifically for this project. They are not derived from third-party recordings and have no third-party license or attribution dependency. Their deterministic source is `scripts/generate-task-sounds.mjs`; rerunning that script recreates the checked-in mono 44.1 kHz, 16-bit PCM WAV files exactly.

- **Bubble Pop** — `task-bubble-pop.wav`; 0.145s; SHA-256 `c0607ed6ca8efc5c26d254c979de928e85eb1fb3e5a4d64ab7194a21a36384ad`.
- **Soft Click** — `task-soft-click.wav`; 0.065s; SHA-256 `aab4480fb0ec3c36d7fc8489639ef3c18f2f559b470d95559fa602f6a87e05b6`.
- **Wood Tap** — `task-wood-tap.wav`; 0.120s; SHA-256 `5590e771610b3c1f55fbb3895b18d16211ce9a38fb4ad8f927631d8caaa09d79`.

These are single, softly enveloped one-shots. CueDone reuses one task-audio element and stops its prior playback before starting another completion sound, so rapid checks replace rather than overlap the cue.
