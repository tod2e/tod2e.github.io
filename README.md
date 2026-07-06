# Truth or Drink GitHub Pages Site

This folder contains a complete static site for drawing Truth or Drink cards from selected categories without repeats.

## Contents

- `index.html` - the web page
- `styles.css` - styling
- `script.js` - player setup, turn order, scoring, deck selection, random draw, and discard-pile logic
- `manifest.json` / `manifest.js` - card metadata
- `cards/` - individual PNG card images sorted into category folders

## Main features

- Clickable pop-up guides for **Choose the mood** and **How to play**
- Player setup before the game begins
- Turn order that rotates through players in the order entered
- Scoreboard for awarded cards
- Rule-aware award panel for Straight Up, Make It a Double, and This Round's On Me
- Category selection
- Random draw button
- Digital discard pile so cards do not repeat until reset
- Responsive layout for phones and tablets

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
