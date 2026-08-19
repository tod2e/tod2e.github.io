# Same Wavelength

A static, GitHub-Pages-ready spectrum guessing party game.

## What this version does

- Two-team pass-the-device play
- Automatic psychic rotation through player lists
- Private target reveal for the psychic
- Touch/mouse draggable semicircle dial
- 2 / 3 / 4 point accuracy bands
- Opposing team's left/right bonus guess
- Optional catch-up turn after a 4-point hit while behind
- First-to-N match scoring
- Original spectrum prompt packs
- Custom user-added spectrum pairs
- `localStorage` persistence
- Undo last scored round
- No frameworks, build step, account, server, or external assets

## Drop it into your existing repo

Copy this directory into:

    /wavelength/

Then it will be available at:

    https://tod2e.github.io/wavelength/

The "All games" button points to `../`, so it will return to your repository root.

## Suggested repo structure when you add more games

    /
    ├── index.html              # game chooser / arcade home
    ├── shared/
    │   ├── hub.css
    │   └── ...
    ├── truth-or-drink/
    │   ├── index.html
    │   ├── styles.css
    │   ├── script.js
    │   └── cards/
    └── wavelength/
        ├── index.html
        ├── styles.css
        ├── spectra.js
        └── script.js

For the least disruptive first step, keep Truth or Drink at the root for now and only add `/wavelength/`.
When you are ready to add a third game, move Truth or Drink into `/truth-or-drink/` and turn `/index.html` into the launcher.

## Local test

From the repository root:

    python3 -m http.server 8000

Then visit:

    http://localhost:8000/wavelength/

## Notes on prompts / branding

The prompt deck in `spectra.js` was written specifically for this implementation rather than copied from a commercial card deck. The UI also uses no official artwork or assets.

If you publish this broadly, consider branding the project as "Same Wavelength", "Spectrum", or another original title while describing it as a spectrum-clue party game.
