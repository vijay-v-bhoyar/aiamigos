import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcesPath = path.join(root, 'src', 'data', 'feed-sources.json');
const cachePath = path.join(root, 'src', 'data', 'feed-cache.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
const prior = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const enabled = sources.filter((source) => source.enabled);
if (!enabled.length) { console.log('Feed sync inactive: no approved source URL is enabled. Cached metadata was unchanged.'); process.exit(0); }

const strip = (value='') => value.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => strip(xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, 'i'))?.[1] ?? '');
const items = [];
for (const source of enabled) {
  if (!/^https:\/\//i.test(source.url)) throw new Error(`${source.id}: enabled feeds require HTTPS`);
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent':'AI-Amigos-Feed-Builder/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
    for (const entry of entries.slice(0,20)) {
      const href = entry.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ?? tag(entry,'link');
      if (!/^https?:\/\//i.test(href)) continue;
      items.push({ source:source.name, sourceId:source.id, title:tag(entry,'title').slice(0,180), url:href, summary:(tag(entry,'description')||tag(entry,'summary')).slice(0,320), publishedAt:tag(entry,'pubDate')||tag(entry,'published')||tag(entry,'updated') });
    }
  } catch (error) {
    if (!prior.items.some((item)=>item.sourceId===source.id)) throw new Error(`${source.id}: feed failed and no cached snapshot exists: ${error.message}`);
    items.push(...prior.items.filter((item)=>item.sourceId===source.id));
  }
}
const now = new Date().toISOString();
fs.writeFileSync(cachePath, JSON.stringify({ generatedAt:now, lastSuccessfulAt:now, items }, null, 2)+'\n');
console.log(`Feed cache updated with ${items.length} sanitized metadata records.`);
