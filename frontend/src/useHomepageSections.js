import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./api";

export const DEFAULT_HOMEPAGE_SECTIONS = [
  {
    sectionKey: "hero",
    sectionName: "Hero Banner & Slider",
    sectionTitle: "Welcome to ISKCON Juhu Self-Excellence",
    sectionSubtitle: "Empowering Students to Achieve Spiritual & Personal Excellence",
    routePath: "/",
    navLabel: "Home",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 1,
    description: "Main hero banner slider at the top of the homepage."
  },
  {
    sectionKey: "upcoming_classes",
    sectionName: "Upcoming Sunday Classes",
    sectionTitle: "Upcoming Classes On Sunday",
    sectionSubtitle: "Timing 6 PM to 9 PM",
    routePath: "/classes",
    navLabel: "Sunday Classes",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 2,
    description: "Sunday sessions, speaker announcements, and seat registrations."
  },
  {
    sectionKey: "featured_journey",
    sectionName: "Featured Pilgrimage / Journey",
    sectionTitle: "Upcoming Journey",
    sectionSubtitle: "Pilgrimage to Holy Dhamas",
    routePath: "/journeys",
    navLabel: "Journeys",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 3,
    description: "Featured journey postcard card with itinerary highlights."
  },
  {
    sectionKey: "trips",
    sectionName: "Pilgrimage Trips",
    sectionTitle: "Upcoming Pilgrimage Trips",
    sectionSubtitle: "Explore Sacred Dhama Yatras",
    routePath: "/trips",
    navLabel: "Trips",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 4,
    description: "Grid of upcoming yatras and pilgrimages with seat booking."
  },
  {
    sectionKey: "courses",
    sectionName: "Courses",
    sectionTitle: "Explore All the Courses",
    sectionSubtitle: "Designed by Experts",
    routePath: "/courses",
    navLabel: "Courses",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 5,
    description: "Course shells, curriculum, and enrollment access."
  },
  {
    sectionKey: "books",
    sectionName: "Books & Literature",
    sectionTitle: "Spiritual Literature & Books",
    sectionSubtitle: "Vedic Wisdom for Modern Living",
    routePath: "/books",
    navLabel: "Books",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 6,
    description: "Srila Prabhupada's books and course companion literature."
  },
  {
    sectionKey: "why_join",
    sectionName: "Why Join / About Self-Excellence",
    sectionTitle: "Why Join Self-Excellence Classes",
    sectionSubtitle: "Spiritual and personal transformation for youth",
    routePath: "/about",
    navLabel: "About",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 7,
    description: "Overview of self-excellence pillars and benefits."
  },
  {
    sectionKey: "video_blogs",
    sectionName: "Video Blogs / Latest Videos",
    sectionTitle: "Latest Videos",
    sectionSubtitle: "Short messages, class highlights, and festival reflections",
    routePath: "/video-blogs",
    navLabel: "Video Blogs",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 8,
    description: "Video wisdom gallery and YouTube/livestream player."
  },
  {
    sectionKey: "preachers",
    sectionName: "Preachers & Visionaries",
    sectionTitle: "Our Qualified Preachers",
    sectionSubtitle: "Experienced Devotees Trained to Lead with Purpose and Purity",
    routePath: "/visionaries",
    navLabel: "Visionaries",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 9,
    description: "Preachers and visionary profiles guiding the youth."
  },
  {
    sectionKey: "benefits",
    sectionName: "Spiritual Benefits",
    sectionTitle: "Benefits of Self-Excellence Classes",
    sectionSubtitle: "Self-Excellence is not just improvement - it is inner transformation.",
    routePath: "/about",
    navLabel: "",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 10,
    description: "Key benefits card grid displaying meditation, character, and values."
  },
  {
    sectionKey: "blogs",
    sectionName: "Blogs & Articles",
    sectionTitle: "Latest Blogs",
    sectionSubtitle: "Insights for spiritual living and student excellence",
    routePath: "/blogs",
    navLabel: "Blogs",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 11,
    description: "Spiritual articles and philosophical reflections."
  },
  {
    sectionKey: "media_highlight",
    sectionName: "Media Highlights & Reflections",
    sectionTitle: "Media Highlight",
    sectionSubtitle: "Glimpses of our temple, festivals, and spiritual activities.",
    routePath: "/gallery/images",
    navLabel: "Media",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 12,
    description: "Photo gallery, festival celebrations, and newsletter subscription."
  },
  {
    sectionKey: "testimonials",
    sectionName: "Devotee Testimonials",
    sectionTitle: "Student Reflections",
    sectionSubtitle: "How the classes are shaping hearts and habits",
    routePath: "/testimonials",
    navLabel: "Testimonials",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 13,
    description: "Student and devotee feedback quotes and star ratings."
  },
  {
    sectionKey: "contact",
    sectionName: "Contact & Inquiries",
    sectionTitle: "Get In Touch",
    sectionSubtitle: "Have questions about classes, books, or pilgrimages?",
    routePath: "/contact",
    navLabel: "Contact",
    homepageVisible: true,
    websiteEnabled: true,
    sortOrder: 14,
    description: "Contact form and inquiry submission."
  }
];

export const notifyHomepageSectionsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("homepage-sections-updated"));
  }
};

export const useHomepageSections = () => {
  const [sections, setSections] = useState(DEFAULT_HOMEPAGE_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/homepage-sections");
      const list = (res && (res.sections || res.items)) || [];
      if (Array.isArray(list) && list.length > 0) {
        setSections(list);
      }
      setError(null);
    } catch (err) {
      console.warn("Failed to fetch homepage sections:", err?.message);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();

    const handleUpdate = () => {
      fetchSections();
    };

    window.addEventListener("homepage-sections-updated", handleUpdate);
    return () => {
      window.removeEventListener("homepage-sections-updated", handleUpdate);
    };
  }, [fetchSections]);

  const sectionMap = useCallback(() => {
    const map = {};
    for (const s of sections) {
      map[s.sectionKey] = s;
    }
    return map;
  }, [sections]);

  const isSectionVisible = useCallback(
    (key) => {
      const s = sections.find((item) => item.sectionKey === key);
      if (!s) return true;
      // Must be visible on homepage AND enabled on website AND active
      if (s.homepageVisible === false) return false;
      if (s.websiteEnabled === false) return false;
      if (s.status === "inactive") return false;
      return true;
    },
    [sections]
  );

  const isPageEnabled = useCallback(
    (routeOrKey) => {
      if (!routeOrKey) return true;
      const normalized = routeOrKey.toLowerCase().trim();

      // Check by sectionKey
      const byKey = sections.find((s) => s.sectionKey?.toLowerCase() === normalized);
      if (byKey && byKey.websiteEnabled === false) {
        return false;
      }

      // Check by routePath
      const byRoute = sections.filter((s) => {
        if (!s.routePath) return false;
        const sPath = s.routePath.toLowerCase();
        return sPath === normalized || normalized.startsWith(sPath + "/");
      });

      for (const s of byRoute) {
        if (s.websiteEnabled === false) {
          return false;
        }
      }

      return true;
    },
    [sections]
  );

  const getSection = useCallback(
    (key) => {
      return sections.find((s) => s.sectionKey === key) || null;
    },
    [sections]
  );

  return {
    sections,
    loading,
    error,
    refetch: fetchSections,
    isSectionVisible,
    isPageEnabled,
    getSection,
    sectionMap
  };
};
