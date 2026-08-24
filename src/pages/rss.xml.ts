import { getCollection } from 'astro:content';

export async function GET({ site }) {
  const articles = (await getCollection('articles', ({ data }) => data.status === 'published' && data.reviewStatus === 'reviewed'))
    .sort((a, b) => b.data.publishedAt.localeCompare(a.data.publishedAt))
    .slice(0, 50);
  const origin = site ?? new URL('https://www.aiamigos.org');
  const items = articles.map((entry) => `<item><title><![CDATA[${entry.data.title}]]></title><link>${origin}articles/${entry.data.routeSlug}/</link><guid>${origin}articles/${entry.data.routeSlug}/</guid><pubDate>${new Date(entry.data.publishedAt).toUTCString()}</pubDate><description><![CDATA[${entry.data.description}]]></description></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AI Amigos</title><link>${origin}</link><description>Practical, sourced guidance for people building and working with AI.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
