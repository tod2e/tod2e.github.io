# Truth or Drink GitHub Pages Site

This folder contains a complete static site for drawing cards from selected categories without repeats.

## Contents

- `index.html` - the web page
- `styles.css` - styling
- `script.js` - deck selection, random draw, and discard-pile logic
- `manifest.json` / `manifest.js` - card metadata
- `cards/` - individual PNG card images sorted into category folders

## Card counts

- On the Rocks: 99 cards
- Last Call: 99 cards
- Happy Hour: 99 cards
- Extra Dirty: 99 cards

Total drawable prompt cards: 396

Artwork/card-back pages with no prompt text were not included in the draw pile.

## Deploying to GitHub Pages

1. Create a new GitHub repo, or use an existing repo.
2. Copy all files from this folder into the repo root.
3. Commit and push to GitHub.
4. In GitHub, go to **Settings → Pages**.
5. Choose **Deploy from a branch**, select `main`, and use `/root`.
6. Wait for GitHub to publish the site.

For a personal site, name the repository `YOURUSERNAME.github.io` and the site will publish at that address. For a normal project repo, GitHub will publish it under `https://YOURUSERNAME.github.io/REPO-NAME/`.

## Local preview

Run this inside the folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Note

Only publish these card images publicly if you have the right to share them.


## Category and rules guide

The homepage includes short explanations for the four category sets and the main card types: Straight Up, Make It a Double, and This Round's On Me. The draw logic also keeps a client-side discard pile so drawn cards do not repeat until the discard pile is reset.
