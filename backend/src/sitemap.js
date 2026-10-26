import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Course,
  UpcomingClass,
  Book,
  Journey,
  Pilgrimage,
  Blog,
  VideoBlog,
  Preacher,
  Page,
  LegalPage,
  SiteSetting
} from "./models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_BASE_URL = "https://iskconselfexcellence.online";

/* Helper to escape XML special characters */
export const xmlEscape = (str = "") => {
  if (typeof str !== "string") str = String(str || "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/* Resolve full URL for images */
export const resolveImageUrl = (img, baseUrl) => {
  if (!img) return "";
  const cleaned = String(img).trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  const root = baseUrl.replace(/\/+$/, "");
  const rel = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return `${root}${rel}`;
};

/* Format ISO date to YYYY-MM-DD */
export const formatDate = (date) => {
  try {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

/* Determine canonical base URL from request or database settings */
export const getBaseUrl = async (req) => {
  try {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
    const setting = await SiteSetting.findOne({ singletonKey: "site" }).lean();
    if (setting?.siteUrl) return setting.siteUrl.replace(/\/+$/, "");
  } catch {
    // fallback
  }

  if (req && req.headers) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  return DEFAULT_BASE_URL;
};

/**
 * Generate fully dynamic, AI- and Google-optimized Sitemap XML.
 * Automatically queries active/published records in real time.
 * If an item is deleted or unpublished, it is immediately omitted.
 */
export const generateSitemapXml = async ({ baseUrl = DEFAULT_BASE_URL } = {}) => {
  const root = baseUrl.replace(/\/+$/, "");
  const now = formatDate(new Date());

  // Parallel live database queries for only active/published entities
  const [
    courses,
    classes,
    books,
    journeys,
    pilgrimages,
    blogs,
    videoBlogs,
    preachers,
    pages,
    legalPages
  ] = await Promise.all([
    Course.find({
      status: { $ne: "archived" },
      $or: [{ active: true }, { status: "published" }, { status: { $exists: false } }]
    }).sort({ updatedAt: -1 }).lean().catch(() => []),

    UpcomingClass.find({
      status: { $ne: "archived" },
      $or: [{ active: true }, { status: "published" }, { status: { $exists: false } }]
    }).sort({ date: -1, updatedAt: -1 }).lean().catch(() => []),

    Book.find({
      status: { $in: ["active", "published"] }
    }).sort({ updatedAt: -1 }).lean().catch(() => []),

    Journey.find({
      status: "published"
    }).sort({ isFeatured: -1, updatedAt: -1 }).lean().catch(() => []),

    Pilgrimage.find({
      status: "published"
    }).sort({ isFeatured: -1, updatedAt: -1 }).lean().catch(() => []),

    Blog.find({
      status: "published"
    }).sort({ publishedAt: -1, updatedAt: -1 }).lean().catch(() => []),

    VideoBlog.find({
      status: "published"
    }).sort({ publishedAt: -1, updatedAt: -1 }).lean().catch(() => []),

    Preacher.find({
      active: { $ne: false }
    }).sort({ updatedAt: -1 }).lean().catch(() => []),

    Page.find({
      status: { $ne: "archived" },
      $or: [{ active: true }, { status: "published" }]
    }).sort({ updatedAt: -1 }).lean().catch(() => []),

    LegalPage.find({}).sort({ updatedAt: -1 }).lean().catch(() => [])
  ]);

  const items = [];

  const addUrl = ({
    loc,
    lastmod,
    changefreq = "weekly",
    priority = "0.8",
    image,
    title,
    caption
  }) => {
    if (!loc) return;
    const url = loc.startsWith("http") ? loc : `${root}${loc.startsWith("/") ? loc : `/${loc}`}`;
    items.push({
      loc: url,
      lastmod: formatDate(lastmod || now),
      changefreq,
      priority: String(priority),
      image: image ? resolveImageUrl(image, root) : null,
      title: title ? xmlEscape(title) : null,
      caption: caption ? xmlEscape(caption) : null
    });
  };

  /* 1. Core High-Priority Static & Catalog Routes */
  addUrl({ loc: "/", lastmod: now, changefreq: "daily", priority: "1.0", title: "ISKCON Juhu Self-Excellence — Vedic Wisdom & Youth Classes" });
  addUrl({ loc: "/courses", lastmod: now, changefreq: "daily", priority: "0.9", title: "Transformative Self-Excellence Courses" });
  addUrl({ loc: "/classes", lastmod: now, changefreq: "daily", priority: "0.9", title: "Sunday Youth Classes at ISKCON Juhu" });
  addUrl({ loc: "/books", lastmod: now, changefreq: "daily", priority: "0.9", title: "Authentic Vedic Books & Publications" });
  addUrl({ loc: "/trips", lastmod: now, changefreq: "weekly", priority: "0.9", title: "Sacred Pilgrimages & Spiritual Journeys" });
  addUrl({ loc: "/blogs", lastmod: now, changefreq: "daily", priority: "0.85", title: "Spiritual Wisdom & Life Transformation Blogs" });
  addUrl({ loc: "/video-blogs", lastmod: now, changefreq: "daily", priority: "0.85", title: "Spiritual Discourses & Video Lectures" });
  addUrl({ loc: "/visionaries", lastmod: now, changefreq: "weekly", priority: "0.8", title: "Preachers & Mentors at ISKCON Juhu" });
  addUrl({ loc: "/gallery/images", lastmod: now, changefreq: "weekly", priority: "0.75", title: "Sacred Image Gallery" });
  addUrl({ loc: "/gallery/videos", lastmod: now, changefreq: "weekly", priority: "0.75", title: "Video Highlights & Kirtans" });
  addUrl({ loc: "/about", lastmod: now, changefreq: "monthly", priority: "0.7", title: "About ISKCON Juhu Self-Excellence" });
  addUrl({ loc: "/contact", lastmod: now, changefreq: "monthly", priority: "0.7", title: "Contact ISKCON Juhu Youth Wing" });
  addUrl({ loc: "/sitemap", lastmod: now, changefreq: "weekly", priority: "0.6", title: "Sitemap Index" });
  addUrl({ loc: "/privacy-policy", lastmod: now, changefreq: "monthly", priority: "0.5", title: "Privacy Policy" });
  addUrl({ loc: "/terms-and-conditions", lastmod: now, changefreq: "monthly", priority: "0.5", title: "Terms and Conditions" });

  /* 2. Dynamic Courses */
  for (const c of courses) {
    if (!c.slug) continue;
    addUrl({
      loc: `/courses/${c.slug}`,
      lastmod: c.updatedAt || c.createdAt,
      changefreq: "weekly",
      priority: "0.9",
      image: c.thumbnail || c.bannerImage,
      title: c.title,
      caption: c.shortDescription || c.description
    });
  }

  /* 3. Dynamic Sunday Classes / Upcoming Classes */
  for (const item of classes) {
    if (!item.slug) continue;
    addUrl({
      loc: `/classes/${item.slug}`,
      lastmod: item.updatedAt || item.createdAt,
      changefreq: "weekly",
      priority: "0.9",
      image: item.image,
      title: item.title,
      caption: `${item.speaker ? `By ${item.speaker}. ` : ""}${item.venue ? `Venue: ${item.venue}. ` : ""}${item.topic || ""}`.trim()
    });
  }

  /* 4. Dynamic Books */
  for (const b of books) {
    if (!b.slug) continue;
    addUrl({
      loc: `/books/${b.slug}`,
      lastmod: b.updatedAt || b.createdAt,
      changefreq: "weekly",
      priority: "0.85",
      image: b.coverImage,
      title: b.title,
      caption: b.shortDescription || `${b.author ? `Author: ${b.author}. ` : ""}${b.description || ""}`.trim()
    });
  }

  /* 5. Dynamic Upcoming Journeys */
  const seenJourneySlugs = new Set();
  for (const j of journeys) {
    if (!j.slug || seenJourneySlugs.has(j.slug)) continue;
    seenJourneySlugs.add(j.slug);
    addUrl({
      loc: `/journeys/${j.slug}`,
      lastmod: j.updatedAt || j.createdAt,
      changefreq: "weekly",
      priority: "0.85",
      image: j.mainImage || j.floatingImage1,
      title: j.title,
      caption: j.routeText || j.shortDescription || j.description
    });
  }

  /* 6. Dynamic Pilgrimages */
  for (const p of pilgrimages) {
    if (!p.slug || seenJourneySlugs.has(p.slug)) continue;
    seenJourneySlugs.add(p.slug);
    addUrl({
      loc: `/trips/${p.slug}`,
      lastmod: p.updatedAt || p.createdAt,
      changefreq: "weekly",
      priority: "0.85",
      image: p.image,
      title: p.title,
      caption: p.route || p.description
    });
  }

  /* 7. Dynamic Blogs */
  for (const blog of blogs) {
    if (!blog.slug) continue;
    addUrl({
      loc: `/blogs/${blog.slug}`,
      lastmod: blog.updatedAt || blog.publishedAt || blog.createdAt,
      changefreq: "monthly",
      priority: "0.8",
      image: blog.image,
      title: blog.title,
      caption: blog.summary
    });
  }

  /* 8. Dynamic Video Blogs */
  for (const v of videoBlogs) {
    if (!v.slug) continue;
    addUrl({
      loc: `/video-blogs/${v.slug}`,
      lastmod: v.updatedAt || v.publishedAt || v.createdAt,
      changefreq: "monthly",
      priority: "0.8",
      image: v.thumbnail,
      title: v.title,
      caption: v.summary || v.description
    });
  }

  /* 9. Dynamic Visionaries / Preachers */
  for (const p of preachers) {
    if (!p.slug) continue;
    addUrl({
      loc: `/visionaries/${p.slug}`,
      lastmod: p.updatedAt || p.createdAt,
      changefreq: "monthly",
      priority: "0.75",
      image: p.image,
      title: p.name || p.title,
      caption: p.title || p.bio
    });
  }

  /* 10. Dynamic CMS Pages */
  for (const pg of pages) {
    if (!pg.slug || ["home", "about", "contact"].includes(pg.slug)) continue;
    addUrl({
      loc: `/${pg.slug}`,
      lastmod: pg.updatedAt || pg.createdAt,
      changefreq: "monthly",
      priority: "0.7",
      title: pg.title
    });
  }

  /* 11. Dynamic Legal Pages */
  for (const leg of legalPages) {
    if (!leg.slug) continue;
    addUrl({
      loc: `/${leg.slug}`,
      lastmod: leg.updatedAt || leg.createdAt,
      changefreq: "monthly",
      priority: "0.5",
      title: leg.title
    });
  }

  // Build XML payload with full schema namespaces (Google Image Sitemap, News, Video, XHTML)
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- Dynamic AI- & Google-Optimized Sitemap for ISKCON Juhu Self-Excellence -->
  <!-- Total Indexed URLs: ${items.length} | Generated: ${new Date().toISOString()} -->
`;

  for (const item of items) {
    xml += `  <url>\n`;
    xml += `    <loc>${xmlEscape(item.loc)}</loc>\n`;
    xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;

    if (item.image) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${xmlEscape(item.image)}</image:loc>\n`;
      if (item.title) {
        xml += `      <image:title>${item.title}</image:title>\n`;
      }
      if (item.caption) {
        xml += `      <image:caption>${item.caption.slice(0, 500)}</image:caption>\n`;
      }
      xml += `    </image:image>\n`;
    }

    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  return { xml, total: items.length, counts: {
    courses: courses.length,
    classes: classes.length,
    books: books.length,
    journeys: journeys.length,
    blogs: blogs.length,
    videoBlogs: videoBlogs.length,
    preachers: preachers.length,
    pages: pages.length
  }};
};

/**
 * Generate robots.txt specifically optimized for:
 * - Googlebot, Bingbot, Slurp, DuckDuckBot
 * - AI Crawlers (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Applebot, Google-Extended)
 * - Declaring canonical Sitemap location
 */
export const generateRobotsTxt = ({ baseUrl = DEFAULT_BASE_URL } = {}) => {
  const root = baseUrl.replace(/\/+$/, "");
  return `# ISKCON Juhu Self-Excellence Robots Directive
# Dynamically Generated for Maximum Search & AI Engine Optimization

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /student/
Disallow: /teacher/
Disallow: /api/admin/
Disallow: /login
Disallow: /register
Disallow: /verify-otp
Disallow: /forgot-password
Disallow: /request-password-reset

# OpenAI Search & Crawlers (ChatGPT Web Browsing & Search)
User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /student/
Disallow: /teacher/

User-agent: ChatGPT-User
Allow: /

# Anthropic Claude AI Search
User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /student/
Disallow: /teacher/

# Perplexity AI Engine
User-agent: PerplexityBot
Allow: /

# Google Gemini & Search Extended
User-agent: Google-Extended
Allow: /

# Apple Intelligence
User-agent: Applebot-Extended
Allow: /

# Canonical Sitemap
Sitemap: ${root}/sitemap.xml
`;
};

/**
 * Generate llms.txt (The Open AI Web Standard for Large Language Models).
 * When ChatGPT, Claude, Perplexity or AI assistants visit /llms.txt,
 * they receive a structured overview of all courses, classes, pilgrimages, and books.
 */
export const generateLlmsTxt = async ({ baseUrl = DEFAULT_BASE_URL } = {}) => {
  const root = baseUrl.replace(/\/+$/, "");

  const [courses, classes, books, journeys, blogs] = await Promise.all([
    Course.find({ status: { $ne: "archived" }, $or: [{ active: true }, { status: "published" }, { status: { $exists: false } }] }).limit(10).lean().catch(() => []),
    UpcomingClass.find({ status: { $ne: "archived" }, $or: [{ active: true }, { status: "published" }, { status: { $exists: false } }] }).limit(10).lean().catch(() => []),
    Book.find({ status: { $in: ["active", "published"] } }).limit(10).lean().catch(() => []),
    Journey.find({ status: "published" }).limit(5).lean().catch(() => []),
    Blog.find({ status: "published" }).limit(10).lean().catch(() => [])
  ]);

  let md = `# ISKCON Juhu Self-Excellence LMS

> Authentic Vedic wisdom, Self-Excellence courses, Sunday youth classes, sacred pilgrimage journeys, and spiritual books from ISKCON Juhu, Mumbai.

Canonical Website: ${root}
Sitemap: ${root}/sitemap.xml

## Key Offerings & Hubs
- [Home Page](${root}/): Vedic spiritual learning platform, Sunday classes, and life transformation.
- [Self-Excellence Courses](${root}/courses): Structured foundational and advanced spiritual courses.
- [Sunday Youth Classes](${root}/classes): Weekly interactive youth sessions at ISKCON Juhu.
- [Sacred Pilgrimages](${root}/trips): Guided spiritual journeys to Vrindavan, Mayapur, Jagannath Puri, and holy Dhamas.
- [Spiritual Books](${root}/books): Authentic Vedic literature by Srila Prabhupada and senior devotees.
- [Spiritual Blogs](${root}/blogs): Articles on fearlessness, mindfulness, overcoming anxiety, and bhakti-yoga.
- [Video Lectures](${root}/video-blogs): Practical life guidance and scripture discourses.

## Active Courses
`;

  for (const c of courses) {
    md += `- [${c.title}](${root}/courses/${c.slug}): ${c.shortDescription || c.description || "Transformative spiritual curriculum."}\n`;
  }

  md += `\n## Upcoming Sunday Classes\n`;
  for (const cl of classes) {
    md += `- [${cl.title}](${root}/classes/${cl.slug}): Speaker: ${cl.speaker || "Senior Devotee"}, Venue: ${cl.venue || "ISKCON Juhu"}\n`;
  }

  md += `\n## Sacred Pilgrimages & Journeys\n`;
  for (const j of journeys) {
    md += `- [${j.title}](${root}/journeys/${j.slug}): Route: ${j.routeText || "Sacred Dhama"}, Duration: ${j.durationDays || 5} Days\n`;
  }

  md += `\n## Authentic Books & Publications\n`;
  for (const b of books) {
    md += `- [${b.title}](${root}/books/${b.slug}): ${b.author ? `By ${b.author}. ` : ""}${b.shortDescription || b.title}\n`;
  }

  md += `\n## Recent Wisdom Blogs\n`;
  for (const bl of blogs) {
    md += `- [${bl.title}](${root}/blogs/${bl.slug}): ${bl.summary || bl.title}\n`;
  }

  return md;
};

/**
 * Write sitemap.xml and robots.txt to static dist/public paths if available.
 * Keeps disk copies synchronized alongside dynamic Express routes.
 */
export const writeSitemapToDisk = async (baseUrl) => {
  try {
    const { xml } = await generateSitemapXml({ baseUrl });
    const robots = generateRobotsTxt({ baseUrl });
    const llms = await generateLlmsTxt({ baseUrl });

    const targetDirs = [
      path.resolve(__dirname, "../../frontend/dist"),
      path.resolve(__dirname, "../../frontend/public"),
      "/var/www/self-excellence/frontend/dist",
      "/var/www/self-excellence/frontend/public"
    ];

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.writeFileSync(path.join(dir, "sitemap.xml"), xml, "utf8");
          fs.writeFileSync(path.join(dir, "robots.txt"), robots, "utf8");
          fs.writeFileSync(path.join(dir, "llms.txt"), llms, "utf8");
        } catch {
          // ignore permission errors on non-writable paths
        }
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
