import news from '../data/news.json';

const ORIGIN = 'https://dal.fyi';
const paths = ['/', '/research/', '/publications/', '/people/', '/news/', '/contact/', ...news.map((n) => `/news/${n.slug}/`)];

export function GET() {
  const urls = paths.flatMap((p) => [p, `/ko${p}`]).map((p) => {
    const base = p.startsWith('/ko/') ? p.slice(3) : p;
    return `  <url>
    <loc>${ORIGIN}${p}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${base}"/>
    <xhtml:link rel="alternate" hreflang="ko" href="${ORIGIN}/ko${base}"/>
  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
