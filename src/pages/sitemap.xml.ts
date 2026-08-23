import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { tracks } from '../data/tracks.mjs';
import { tools } from '../data/tools.mjs';
import { templates } from '../data/templates.mjs';

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => data.status === 'published');
  const urls = [
    '/', '/start-here/', '/app/', '/playbooks/', '/topics/', '/articles/', '/careers/', '/about/', '/contact/', '/newsletter/', '/privacy/', '/search/', '/news/', '/tools/', '/templates/', '/tracks/',
    ...tracks.map((track) => `/tracks/${track.slug}/`),
    ...tools.map((tool) => `/tools/${tool.slug}/`),
    ...templates.map((template) => `/templates/${template.slug}/`),
    ...site.topics.map((topic) => `/topics/${topic.slug}/`),
    ...articles.map((entry) => `/articles/${entry.data.routeSlug}/`)
  ];
  const body = urls.map((url) => `<url><loc>${new URL(url, site.url).toString()}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
