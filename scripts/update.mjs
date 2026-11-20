// Fetch the latest regular videos (no Shorts) of every channel in
// channels.json and write them to videos.json, newest first.
// It reads each channel's public YouTube feed, so it needs no API key.
// Node 18 or newer, no packages:
//
//   node scripts/update.mjs

import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(new URL(name, root), 'utf8'));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

const channels = await readJson('channels.json');
const previous = await readJson('videos.json', { videos: [] });

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, e) => {
    if (e[0] !== '#') return ENTITIES[e] ?? match;
    return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : '';
}

async function latest(channel) {
  // "UULF" + the channel ID without its "UC" is the channel's uploads
  // playlist minus Shorts. Its feed lists the 15 newest videos.
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${channel.id.slice(2)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const videos = xml
        .split('<entry>')
        .slice(1)
        .map((entry) => ({
          id: tag(entry, 'yt:videoId'),
          title: tag(entry, 'title'),
          channel: channel.name,
          published: tag(entry, 'published'),
        }))
        .filter((v) => v.id && v.published);
      if (!videos.length) throw new Error('the feed has no videos');
      return videos;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

const videos = [];
let failed = 0;
for (const channel of channels) {
  try {
    const found = await latest(channel);
    videos.push(...found);
    console.log(`${channel.name}: ${found.length} videos`);
  } catch (err) {
    // Keep what we had for this channel rather than dropping it from the page.
    failed++;
    const kept = previous.videos.filter((v) => v.channel === channel.name);
    videos.push(...kept);
    console.warn(`${channel.name}: ${err.message}; keeping the ${kept.length} videos from last time`);
  }
}

if (failed === channels.length) {
  console.error('Every feed failed, so videos.json was left as it was.');
  process.exit(1);
}

videos.sort((a, b) => new Date(b.published) - new Date(a.published));

if (JSON.stringify(videos) === JSON.stringify(previous.videos)) {
  console.log('No change.');
} else {
  const out = { updated: new Date().toISOString(), videos };
  await writeFile(new URL('videos.json', root), JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${videos.length} videos to videos.json.`);
}
