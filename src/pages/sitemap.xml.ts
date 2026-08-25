import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { tracks } from '../data/tracks.mjs';
import { tools } from '../data/tools.mjs';
import { templates } from '../data/templates.mjs';
import { playbooks } from '../data/outcome-network.mjs';
import { methods } from '../data/evidence-platform.mjs';
import { methodExamples, pilotReadyRelease } from '../data/pilot-ready-release.mjs';

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => data.status === 'published' && data.reviewStatus === 'reviewed');
  const urls = [
    '/', '/start-here/', '/app/', '/endeavor/', '/methods/', '/methods/examples/', '/participate/', '/evidence/', '/field-studies/', '/adoption/', '/outcomes/', '/impact/', '/research/', '/reviews/', '/reviews/kit/', `/releases/${pilotReadyRelease.id}/`, '/timeline/', '/corrections/', '/data-policy/', '/playbooks/', '/benchmarks/', '/challenges/', '/topics/', '/articles/', '/careers/', '/about/', '/about/vijay-bhoyar/', '/contact/', '/newsletter/', '/privacy/', '/search/', '/news/', '/tools/', '/templates/', '/tracks/',
    ...methods.map((method) => `/methods/${method.slug}/`),
    ...methodExamples.map((example) => `/methods/examples/${example.slug}/`),
    ...playbooks.map((playbook) => `/playbooks/${playbook.slug}/`),
    ...tracks.map((track) => `/tracks/${track.slug}/`),
    ...tools.map((tool) => `/tools/${tool.slug}/`),
    ...templates.map((template) => `/templates/${template.slug}/`),
    ...site.topics.map((topic) => `/topics/${topic.slug}/`),
    ...articles.map((entry) => `/articles/${entry.data.routeSlug}/`)
  ];
  const body = urls.map((url) => `<url><loc>${new URL(url, site.url).toString()}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
