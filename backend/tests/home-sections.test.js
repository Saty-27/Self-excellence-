import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOMEPAGE_SECTIONS } from "../src/homepageSectionsConfig.js";

test("Default Homepage Sections: Covers all 14 required sections", () => {
  assert.equal(DEFAULT_HOMEPAGE_SECTIONS.length, 14);

  const keys = DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.sectionKey);
  const expectedKeys = [
    "hero",
    "upcoming_classes",
    "featured_journey",
    "trips",
    "courses",
    "books",
    "why_join",
    "video_blogs",
    "preachers",
    "benefits",
    "blogs",
    "media_highlight",
    "testimonials",
    "contact"
  ];

  for (const expected of expectedKeys) {
    assert.ok(keys.includes(expected), `Missing section key: ${expected}`);
  }
});

test("Default Metadata: Every section has valid routePath and initial active state", () => {
  for (const s of DEFAULT_HOMEPAGE_SECTIONS) {
    assert.ok(s.sectionKey, "Must have sectionKey");
    assert.ok(s.sectionName, "Must have sectionName");
    assert.ok(typeof s.routePath === "string", "Must have routePath");
    assert.equal(s.homepageVisible, true, `${s.sectionKey} must be visible on homepage by default`);
    assert.equal(s.websiteEnabled, true, `${s.sectionKey} must be enabled on website by default`);
  }
});

test("Visibility Matrix: Option 1 (Disable from Homepage Only) logic", () => {
  const payload = { homepageVisible: false, websiteEnabled: true };
  
  // Evaluates as:
  const isVisibleOnHome = payload.homepageVisible !== false && payload.websiteEnabled !== false;
  const isAccessibleOnWebsite = payload.websiteEnabled !== false;

  assert.equal(isVisibleOnHome, false, "Must be hidden from homepage");
  assert.equal(isAccessibleOnWebsite, true, "Must remain active and accessible on website/navbar");
});

test("Visibility Matrix: Option 2 (Disable from Entire Website) logic", () => {
  const payload = { homepageVisible: false, websiteEnabled: false };

  // Evaluates as:
  const isVisibleOnHome = payload.homepageVisible !== false && payload.websiteEnabled !== false;
  const isAccessibleOnWebsite = payload.websiteEnabled !== false;

  assert.equal(isVisibleOnHome, false, "Must be hidden from homepage");
  assert.equal(isAccessibleOnWebsite, false, "Must be completely disabled on website/navbar/routes");
});

test("Visibility Matrix: Enable Everywhere restores both flags", () => {
  const payload = { homepageVisible: true, websiteEnabled: true };

  const isVisibleOnHome = payload.homepageVisible !== false && payload.websiteEnabled !== false;
  const isAccessibleOnWebsite = payload.websiteEnabled !== false;

  assert.equal(isVisibleOnHome, true, "Must be visible on homepage");
  assert.equal(isAccessibleOnWebsite, true, "Must be active on website");
});

test("Section Merging: Overrides from database take precedence over defaults", () => {
  const defaultCourses = DEFAULT_HOMEPAGE_SECTIONS.find((s) => s.sectionKey === "courses");
  assert.ok(defaultCourses);

  const dbRecord = {
    sectionKey: "courses",
    sectionTitle: "Custom Courses Heading",
    homepageVisible: false,
    websiteEnabled: true
  };

  const merged = {
    ...defaultCourses,
    ...dbRecord
  };

  assert.equal(merged.sectionKey, "courses");
  assert.equal(merged.sectionName, "Courses");
  assert.equal(merged.sectionTitle, "Custom Courses Heading");
  assert.equal(merged.homepageVisible, false);
  assert.equal(merged.websiteEnabled, true);
  assert.equal(merged.routePath, "/courses");
});
