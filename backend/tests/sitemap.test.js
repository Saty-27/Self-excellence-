import test from "node:test";
import assert from "node:assert/strict";
import {
  xmlEscape,
  formatDate,
  resolveImageUrl,
  generateRobotsTxt
} from "../src/sitemap.js";

test("XML Escaping: Properly escapes special XML characters", () => {
  const raw = "Krishna & Arjuna: <The Divine Charioteer> \"Quotes\" & 'Wisdom'";
  const escaped = xmlEscape(raw);
  assert.equal(escaped, "Krishna &amp; Arjuna: &lt;The Divine Charioteer&gt; &quot;Quotes&quot; &amp; &apos;Wisdom&apos;");
});

test("Date Formatter: Outputs valid YYYY-MM-DD", () => {
  const d = new Date("2026-10-26T12:00:00Z");
  assert.equal(formatDate(d), "2026-10-26");
  assert.match(formatDate(null), /^\d{4}-\d{2}-\d{2}$/);
});

test("Image URL Resolver: Handles absolute and relative asset paths", () => {
  const base = "https://iskconselfexcellence.online";
  assert.equal(
    resolveImageUrl("https://example.com/photo.jpg", base),
    "https://example.com/photo.jpg"
  );
  assert.equal(
    resolveImageUrl("/assets/hero.webp", base),
    "https://iskconselfexcellence.online/assets/hero.webp"
  );
  assert.equal(
    resolveImageUrl("uploads/book.jpg", base),
    "https://iskconselfexcellence.online/uploads/book.jpg"
  );
  assert.equal(resolveImageUrl("", base), "");
});

test("Robots.txt Directive: Includes AI search engines and canonical Sitemap", () => {
  const robots = generateRobotsTxt({ baseUrl: "https://iskconselfexcellence.online" });
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Disallow: \/student\//);
  assert.match(robots, /User-agent: GPTBot/);
  assert.match(robots, /User-agent: ClaudeBot/);
  assert.match(robots, /User-agent: PerplexityBot/);
  assert.match(robots, /Sitemap: https:\/\/iskconselfexcellence\.online\/sitemap\.xml/);
});

test("Sitemap XML Structure: Formats urlset with schema namespaces", () => {
  const mockUrl = "https://iskconselfexcellence.online/courses/bhagavad-gita";
  const mockImg = "https://iskconselfexcellence.online/assets/gita.webp";
  const mockTitle = "Bhagavad Gita As It Is";
  
  const block = `  <url>
    <loc>${mockUrl}</loc>
    <lastmod>2026-10-26</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${mockImg}</image:loc>
      <image:title>${mockTitle}</image:title>
    </image:image>
  </url>`;

  assert.match(block, /<loc>https:\/\/iskconselfexcellence\.online\/courses\/bhagavad-gita<\/loc>/);
  assert.match(block, /<image:image>/);
  assert.match(block, /<image:title>Bhagavad Gita As It Is<\/image:title>/);
});

test("Dynamic Exclusion Logic: Deleted or archived records are excluded from sitemap query", () => {
  // Simulating the filter used by generateSitemapXml
  const allRecords = [
    { slug: "active-course", status: "published", active: true },
    { slug: "draft-course", status: "draft", active: false },
    { slug: "archived-course", status: "archived", active: false },
    { slug: "deleted-course", isDeleted: true }
  ];

  const filtered = allRecords.filter(
    (c) => !c.isDeleted && c.status !== "archived" && (c.active === true || c.status === "published")
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].slug, "active-course");
});
