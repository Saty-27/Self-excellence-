import test from "node:test";
import assert from "node:assert/strict";

/* Direct unit tests of permission enforcement logic */

const ROLE_LEVEL = {
  main_admin: 100,
  admin: 80,
  manager: 60,
  editor: 40,
  viewer: 20
};

const STAFF_ROLES = ["main_admin", "admin", "manager", "editor", "viewer"];
const isStaff = (user) => Boolean(user && STAFF_ROLES.includes(user.role));
const isFullAdmin = (user) => Boolean(user && (user.role === "main_admin" || user.role === "admin"));

const ADMIN_SECTIONS = [
  "dashboard", "users", "roles", "activity-log", "sessions",
  "banners", "home-sections", "about-sections", "pages",
  "courses", "lessons", "course-requests", "exams",
  "journeys", "trips", "trip-bookings", "booking-taxes", "upcoming-classes",
  "visionaries", "teachers", "blogs", "video-blogs", "media",
  "subscribers", "contact-messages", "comments", "chat",
  "footer", "site-settings", "traffic", "reports", "assets",
  "books", "book-orders", "book-payment-settings",
  "testimonials", "notifications"
];

const SECTION_ALIASES = {
  journeys: "journeys",
  pilgrimages: "trips",
  trips: "trips",
  "pilgrimage-bookings": "trip-bookings",
  "trip-bookings": "trip-bookings",
  "booking-taxes": "booking-taxes",
  "upcoming-classes": "upcoming-classes",
  "media/images": "media",
  "media/videos": "media",
  "gallery-images": "media",
  "gallery-videos": "media",
  preachers: "visionaries",
  visionaries: "visionaries",
  teachers: "teachers",
  "video-intro": "home-sections",
  "home-sections": "home-sections",
  "about-sections": "about-sections",
  "trips-overview": "trips",
  "trip-stats": "trips",
  "book-orders": "book-orders",
  "book-payment-settings": "book-payment-settings",
  books: "books",
  "contact-settings": "contact-messages",
  contact: "contact-messages",
  "contact-messages": "contact-messages",
  testimonials: "testimonials",
  staff: "roles",
  roles: "roles",
  banners: "banners",
  courses: "courses",
  lessons: "lessons",
  assets: "assets",
  "course-requests": "course-requests",
  "activity-log": "activity-log",
  sessions: "sessions",
  users: "users",
  dashboard: "dashboard",
  subscribers: "subscribers",
  comments: "comments",
  chat: "chat",
  footer: "footer",
  "site-settings": "site-settings",
  traffic: "traffic",
  reports: "reports",
  notifications: "notifications",
  exams: "exams"
};

const sectionFor = (resource = "") => {
  const head = String(resource).split("?")[0].replace(/^\/api\/admin\//, "").replace(/^\/api\//, "").replace(/^\//, "");
  if (SECTION_ALIASES[head]) return SECTION_ALIASES[head];
  const first = head.split("/")[0];
  return SECTION_ALIASES[first] || first;
};

const canAccessSection = (user, section, action = "view") => {
  if (!user) return false;
  if (!isStaff(user)) return false;
  if (isFullAdmin(user)) return true;

  const normalizedSection = sectionFor(section);
  if (normalizedSection === "upload") {
    return (user.sectionAccess || []).some((g) => g.create || g.edit);
  }

  const normalizedAction =
    action === "delete" || action === "canDelete"
      ? "canDelete"
      : action === "edit" || action === "update"
      ? "edit"
      : action === "create"
      ? "create"
      : "view";

  const grant = (user.sectionAccess || []).find((g) => g.section === normalizedSection);
  if (!grant) return false;

  if (normalizedAction === "view") return grant.view !== false;
  return Boolean(grant[normalizedAction]);
};

const computeUserPermissions = (user) => {
  if (!user || !isStaff(user)) return [];
  if (isFullAdmin(user)) {
    return ADMIN_SECTIONS.flatMap((sec) => [
      `${sec}.view`,
      `${sec}.read`,
      `${sec}.create`,
      `${sec}.edit`,
      `${sec}.update`,
      `${sec}.delete`,
      `${sec}.canDelete`
    ]);
  }
  const perms = [];
  for (const grant of (user.sectionAccess || [])) {
    if (!grant || !grant.section) continue;
    const sec = grant.section;
    if (grant.view !== false) perms.push(`${sec}.view`, `${sec}.read`);
    if (grant.create) perms.push(`${sec}.create`);
    if (grant.edit || grant.update) perms.push(`${sec}.edit`, `${sec}.update`);
    if (grant.canDelete || grant.delete) perms.push(`${sec}.delete`, `${sec}.canDelete`);
  }
  return perms;
};

// ==========================================
// TESTS
// ==========================================

test("Full Admin: role 'admin' has complete access across all sections and CRUD actions", () => {
  const fullAdmin = { _id: "admin-1", role: "admin", sectionAccess: [] };
  
  assert.equal(isFullAdmin(fullAdmin), true);
  for (const sec of ADMIN_SECTIONS) {
    assert.equal(canAccessSection(fullAdmin, sec, "view"), true, `Admin should view ${sec}`);
    assert.equal(canAccessSection(fullAdmin, sec, "create"), true, `Admin should create in ${sec}`);
    assert.equal(canAccessSection(fullAdmin, sec, "edit"), true, `Admin should edit in ${sec}`);
    assert.equal(canAccessSection(fullAdmin, sec, "canDelete"), true, `Admin should delete in ${sec}`);
  }
});

test("Main Admin: role 'main_admin' is completely unrestricted", () => {
  const mainAdmin = { _id: "main-admin-1", role: "main_admin" };
  assert.equal(isFullAdmin(mainAdmin), true);
  assert.equal(canAccessSection(mainAdmin, "journeys", "create"), true);
  assert.equal(canAccessSection(mainAdmin, "teachers", "canDelete"), true);
  assert.equal(canAccessSection(mainAdmin, "courses", "edit"), true);
});

test("Granular Permissions: Staff with CREATE ONLY can create, but CANNOT edit or delete", () => {
  const staffCreator = {
    _id: "staff-c",
    role: "manager",
    sectionAccess: [
      { section: "journeys", view: true, create: true, edit: false, canDelete: false },
      { section: "courses", view: true, create: true, edit: false, canDelete: false }
    ]
  };

  assert.equal(canAccessSection(staffCreator, "journeys", "view"), true);
  assert.equal(canAccessSection(staffCreator, "journeys", "create"), true);
  assert.equal(canAccessSection(staffCreator, "journeys", "edit"), false, "Staff with create only must NOT edit");
  assert.equal(canAccessSection(staffCreator, "journeys", "canDelete"), false, "Staff with create only must NOT delete");

  assert.equal(canAccessSection(staffCreator, "courses", "create"), true);
  assert.equal(canAccessSection(staffCreator, "courses", "edit"), false);
  assert.equal(canAccessSection(staffCreator, "courses", "canDelete"), false);
});

test("Granular Permissions: Staff with EDIT ONLY can edit, but CANNOT create or delete", () => {
  const staffEditor = {
    _id: "staff-e",
    role: "editor",
    sectionAccess: [
      { section: "journeys", view: true, create: false, edit: true, canDelete: false }
    ]
  };

  assert.equal(canAccessSection(staffEditor, "journeys", "view"), true);
  assert.equal(canAccessSection(staffEditor, "journeys", "create"), false, "Staff with edit only must NOT create");
  assert.equal(canAccessSection(staffEditor, "journeys", "edit"), true, "Staff with edit only CAN edit");
  assert.equal(canAccessSection(staffEditor, "journeys", "canDelete"), false, "Staff with edit only must NOT delete");
});

test("Granular Permissions: Staff with DELETE ONLY can delete, but CANNOT create or edit", () => {
  const staffDeleter = {
    _id: "staff-d",
    role: "manager",
    sectionAccess: [
      { section: "journeys", view: true, create: false, edit: false, canDelete: true }
    ]
  };

  assert.equal(canAccessSection(staffDeleter, "journeys", "view"), true);
  assert.equal(canAccessSection(staffDeleter, "journeys", "create"), false);
  assert.equal(canAccessSection(staffDeleter, "journeys", "edit"), false);
  assert.equal(canAccessSection(staffDeleter, "journeys", "canDelete"), true);
});

test("Granular Permissions: Staff with NO PERMISSION on a section is completely blocked", () => {
  const staffNoAccess = {
    _id: "staff-none",
    role: "viewer",
    sectionAccess: [
      { section: "blogs", view: true, create: false, edit: false, canDelete: false }
    ]
  };

  assert.equal(canAccessSection(staffNoAccess, "journeys", "view"), false);
  assert.equal(canAccessSection(staffNoAccess, "journeys", "create"), false);
  assert.equal(canAccessSection(staffNoAccess, "journeys", "edit"), false);
  assert.equal(canAccessSection(staffNoAccess, "journeys", "canDelete"), false);
  assert.equal(canAccessSection(staffNoAccess, "courses", "view"), false);
  assert.equal(canAccessSection(staffNoAccess, "teachers", "view"), false);
});

test("Section Aliases: Canonical mapping works for all endpoints", () => {
  assert.equal(sectionFor("/api/admin/journeys"), "journeys");
  assert.equal(sectionFor("/api/admin/pilgrimages"), "trips");
  assert.equal(sectionFor("/api/admin/pilgrimage-bookings/123/approve"), "trip-bookings");
  assert.equal(sectionFor("/api/admin/staff"), "roles");
  assert.equal(sectionFor("/api/admin/teachers"), "teachers");
  assert.equal(sectionFor("/api/courses"), "courses");
  assert.equal(sectionFor("/api/banners"), "banners");
  assert.equal(sectionFor("/api/admin/assets"), "assets");
  assert.equal(sectionFor("/api/admin/course-requests/123/approve"), "course-requests");
});

test("Upload Permission: Allowed for staff with create or edit in at least one section", () => {
  const staffWithCreate = {
    role: "manager",
    sectionAccess: [{ section: "blogs", view: true, create: true }]
  };
  const staffReadOnly = {
    role: "viewer",
    sectionAccess: [{ section: "blogs", view: true, create: false, edit: false }]
  };
  const learnerUser = {
    role: "student"
  };

  assert.equal(canAccessSection(staffWithCreate, "upload", "create"), true);
  assert.equal(canAccessSection(staffReadOnly, "upload", "create"), false);
  assert.equal(canAccessSection(learnerUser, "upload", "create"), false);
});

test("computeUserPermissions: Generates exhaustive permission list for Full Admin and exact for staff", () => {
  const fullAdmin = { role: "admin" };
  const perms = computeUserPermissions(fullAdmin);
  assert.ok(perms.includes("journeys.view"));
  assert.ok(perms.includes("journeys.create"));
  assert.ok(perms.includes("journeys.edit"));
  assert.ok(perms.includes("journeys.delete"));
  assert.ok(perms.includes("courses.create"));
  assert.ok(perms.includes("teachers.delete"));

  const granularStaff = {
    role: "editor",
    sectionAccess: [
      { section: "journeys", view: true, create: true, edit: true, canDelete: false }
    ]
  };
  const staffPerms = computeUserPermissions(granularStaff);
  assert.ok(staffPerms.includes("journeys.view"));
  assert.ok(staffPerms.includes("journeys.create"));
  assert.ok(staffPerms.includes("journeys.edit"));
  assert.equal(staffPerms.includes("journeys.delete"), false);
  assert.equal(staffPerms.includes("courses.view"), false);
});
