# Highway Rush

A free endless highway racing game: HTML5 Canvas, vanilla JavaScript, no libraries, no backend. Deploys as a static site (no `vercel.json` needed).

## Files
```
index.html     game page, menus, SEO tags, instructions, reserved ad slot
style.css      all styling
game.js        game engine (loop, input, rendering, sound, saving)
ads.js         ad code kept separate; disabled by default
about.html  contact.html  privacy.html   (fill in the [BRACKETED] items)
```

## Architecture
One `requestAnimationFrame` loop is started once. A `state` variable (`menu`, `playing`, `paused`, `over`) decides what updates; Restart only calls `reset()`, so no extra loops, listeners or old traffic remain. Depth uses a simple perspective formula (`s = CAM / (z + CAM)`), and objects are sorted far to near. Best score and mute are saved in localStorage.

## Test locally
Double-click `index.html`, or run `npx serve` in the folder.

## Before you launch
- Replace the placeholders in `contact.html`, `privacy.html`, `about.html`.
- Add your real URL to the Open Graph tags in `index.html` after deploying.
- Ads are off. Enable only after your ad account and site are approved (approval is never guaranteed). Never place ads over the controls.

## Deploy: GitHub + Vercel (beginner steps)
1. **GitHub account:** go to github.com, click **Sign up**, finish verification.
2. **New repository:** click **+** (top right) > **New repository**. Name it `highway-rush`, choose **Public**, click **Create repository**.
3. **Upload files:** on the empty repo page click **uploading an existing file**. Drag in all files (index.html, style.css, game.js, ads.js, about.html, contact.html, privacy.html, README.md). Select files, not the parent folder, so `index.html` is at the top level. Click **Commit changes**.
4. **Vercel account:** go to vercel.com, click **Sign Up** > **Continue with GitHub** and authorize.
5. **Import:** click **Add New…** > **Project**. Find `highway-rush`, click **Import** (if it's missing, click **Adjust GitHub App Permissions** and allow that repo).
6. **Configure:** Framework Preset: **Other**. Leave Build Command and Output Directory empty. Root Directory: `./`.
7. **Deploy:** click **Deploy**. After about 30 seconds you get a URL like `highway-rush.vercel.app`.
8. **Test on mobile:** open the URL on your phone in portrait and landscape. Check steering, pause, sound and that the page doesn't scroll while playing.
9. **Update later:** edit a file on GitHub (open it, click the pencil, **Commit changes**) or upload replacements via **Add file > Upload files**. Vercel redeploys automatically in under a minute.

## Troubleshooting
- **404 NOT_FOUND:** `index.html` is inside a subfolder. Move it to the repo root, or set Root Directory in Vercel > Settings > General.
- **Old version showing:** hard refresh (Ctrl+Shift+R) or check the Deployments tab for a failed build.
- **No sound:** browsers need a tap first; check the mute button.
- **Blank game:** open browser DevTools (F12) > Console for errors; confirm all files uploaded with exact names (case-sensitive).
- **Repo not listed in Vercel:** grant Vercel access to it in GitHub app permissions.
