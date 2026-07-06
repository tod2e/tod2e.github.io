# Truth or Drink card drawer

A static GitHub Pages-ready Truth or Drink card drawer.

## What is included

- 396 prompt card images sorted into four category folders
- `index.html`, `styles.css`, and `script.js`
- `manifest.js` with the card metadata used by the app
- discard-pile logic so drawn cards do not repeat until reset
- player setup and turn-order tracking
- point tracking according to the card rules
- mood/category presets
- target suggestions for Straight Up / Make It a Double / This Round's On Me
- undo, game log, winning score, bulk player add, randomize order, and new-round controls

## How to deploy on GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder, not the zip file itself.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the root folder `/`.
6. Save. GitHub will publish the site after a short build.

## Local testing

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

The app stores game progress in browser `localStorage`, so refreshes preserve the current game on the same device/browser. Reset the game or clear site data to wipe saved progress.
