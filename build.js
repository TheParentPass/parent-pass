// Builds the Parent Pass website from ONE source file.
//
//   src/site.html  ->  dist/index.html, dist/roblox/index.html, dist/youtube/index.html, ...
//
// Edit src/site.html only. Each <section class="page" id="..."> becomes its own page
// with its own web address, title and description (from data-title / data-desc).
// Links like href="#roblox" or href="#r-controls" are rewritten to the right page.
// Files in public/ (fonts, robots.txt, Google verification) are copied as they are.
//
// Run locally with:  node build.js   (Netlify runs it automatically on every deploy)

const fs = require('fs');
const path = require('path');

const SITE = 'https://parent-pass.netlify.app';
// Visitor counts (GoatCounter, no cookies). Put the site code here, e.g. 'parentpass', to switch on.
const GOATCOUNTER = '';

const SLUGS = {
  home: '', roblox: 'roblox', brawl: 'brawl-stars', minecraft: 'minecraft', fortnite: 'fortnite',
  youtube: 'youtube', notyet: 'not-yet', ahead: 'get-ahead', findout: 'find-out', words: 'words',
  help: 'help', about: 'about', feedback: 'feedback', thanks: 'thanks'
};
const url = id => '/' + (SLUGS[id] ? SLUGS[id] + '/' : '');

const src = fs.readFileSync(path.join(__dirname, 'src', 'site.html'), 'utf8');
const mainOpen = src.indexOf('<main>') + '<main>'.length;
const mainClose = src.indexOf('</main>');
if (mainOpen < 6 || mainClose < 0) throw new Error('Could not find <main> in src/site.html');
const head = src.slice(0, mainOpen);
const tail = src.slice(mainClose);
const body = src.slice(mainOpen, mainClose);

// Collect pages
const sectionRe = /<section class="page" id="([a-z]+)"([^>]*)>[\s\S]*?<\/section>/g;
const pages = [];
let m;
while ((m = sectionRe.exec(body))) {
  const [html, id, attrs] = m;
  if (!(id in SLUGS)) throw new Error('No web address set in build.js for section id "' + id + '"');
  const attr = name => { const a = attrs.match(new RegExp(name + '="([^"]*)"')); return a ? a[1] : ''; };
  pages.push({ id, html, title: attr('data-title'), desc: attr('data-desc'), noindex: attr('data-noindex') === '1' });
}
if (!pages.length) throw new Error('No pages found');

// Which page does every id="..." live on?
const anchorPage = {};
for (const p of pages) {
  for (const a of p.html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)) anchorPage[a[1]] = p.id;
}

function rewriteLinks(html, current) {
  return html.replace(/href="#([A-Za-z0-9_-]+)"/g, (all, id) => {
    if (id in SLUGS && pages.some(p => p.id === id)) return 'href="' + url(id) + '"';
    const owner = anchorPage[id];
    if (owner && owner !== current) return 'href="' + url(owner) + '#' + id + '"';
    if (!owner) console.warn('Warning: link to #' + id + ' on page "' + current + '" has no target');
    return all;
  });
}

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const redirectMap = {};
for (const p of pages) redirectMap[p.id] = url(p.id);
for (const [a, pid] of Object.entries(anchorPage)) if (!(a in redirectMap)) redirectMap[a] = url(pid) + '#' + a;

const legacyRedirect = '<script>(function(){var m=' + JSON.stringify(redirectMap) +
  ';var h=location.hash.slice(1);if(h&&m[h]&&m[h]!=="/")location.replace(m[h]);})();</script>\n';
const analytics = GOATCOUNTER
  ? '<script data-goatcounter="https://' + GOATCOUNTER + '.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>\n'
  : '';

const out = path.join(__dirname, 'dist');
fs.rmSync(out, { recursive: true, force: true });

for (const p of pages) {
  const pageUrl = SITE + url(p.id);
  let h = head;
  if (p.title) h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + p.title + '</title>');
  if (p.desc) h = h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(p.desc) + '">');
  h = h.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + pageUrl + '">');
  h = h.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + pageUrl + '">');
  if (p.title) h = h.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(p.title) + '">');
  if (p.desc) h = h.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(p.desc) + '">');
  if (p.noindex) h = h.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  if (analytics) h = h.replace('</head>', analytics + '</head>');
  h = rewriteLinks(h, p.id);
  // mark the current page in the top menu
  h = h.replace('<a href="' + url(p.id) + '">', '<a href="' + url(p.id) + '" class="on" aria-current="page">');

  const section = rewriteLinks(p.html.replace('<section class="page"', '<section class="page on"'), p.id);
  let t = rewriteLinks(tail, p.id).replace(/<script data-single-only>[\s\S]*?<\/script>\n?/, '');
  if (p.id === 'home') t = legacyRedirect + t;

  const dir = path.join(out, SLUGS[p.id]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), h + '\n' + section + '\n\n' + t);
}

// Static files
fs.cpSync(path.join(__dirname, 'public'), out, { recursive: true });

// Sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = pages.filter(p => !p.noindex).map(p =>
  '  <url><loc>' + SITE + url(p.id) + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq></url>').join('\n');
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');

console.log('Built ' + pages.length + ' pages: ' + pages.map(p => url(p.id)).join(' '));
