# learning feed

The latest videos from a short list of YouTube channels (for now 3Blue1Brown and Veritasium), with no recommendations and no Shorts. Videos play on the page through YouTube's privacy-enhanced embed.

Live: https://reservetempo.github.io/learning-feed/

## How it works

- `channels.json` lists the channels.
- `scripts/update.mjs` reads each channel's public YouTube feed (no API key needed) and writes its 15 newest regular videos to `videos.json`.
- `.github/workflows/update.yml` runs that script every 3 hours and commits `videos.json` when it changes. GitHub Pages then republishes the site.

## Add a channel

1. Get the channel ID, which starts with `UC`: on the channel's page, open the "more about this channel" panel, then **Share channel → Copy channel ID**.
2. Add `{ "name": "Channel Name", "id": "UC..." }` to `channels.json` and push. The workflow runs on that push and adds the channel's videos.

## Run it locally

```bash
node scripts/update.mjs
python -m http.server 8000
```

Then open http://localhost:8000/.
