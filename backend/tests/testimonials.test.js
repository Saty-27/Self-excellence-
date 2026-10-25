import test from "node:test";
import assert from "node:assert/strict";

// Validation helper simulating backend validation
function validateTestimonialInput({ rating, testimonialText, quote }) {
  const rawText = (testimonialText || quote || "").trim();

  if (rating === undefined || rating === null || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return { valid: false, error: "Please select a rating from 1 to 5 stars." };
  }
  if (!rawText) {
    return { valid: false, error: "Testimonial text is required." };
  }
  if (rawText.length < 20) {
    return { valid: false, error: "Testimonial must be at least 20 characters long." };
  }
  if (rawText.length > 1000) {
    return { valid: false, error: "Testimonial cannot exceed 1000 characters." };
  }
  return { valid: true, text: rawText, rating: Number(rating) };
}

// Moderation rules helper simulating student submission & editing
function createStudentSubmission(user, { rating, testimonialText }) {
  const validation = validateTestimonialInput({ rating, testimonialText });
  if (!validation.valid) throw new Error(validation.error);

  return {
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    testimonialText: validation.text,
    rating: validation.rating,
    status: "pending",
    showOnHomepage: false,
    isFeatured: false
  };
}

function updateStudentSubmission(user, existingDoc, { rating, testimonialText }) {
  if (String(existingDoc.userId) !== String(user._id)) {
    throw new Error("Unauthorized to edit this testimonial");
  }
  const validation = validateTestimonialInput({ rating, testimonialText });
  if (!validation.valid) throw new Error(validation.error);

  return {
    ...existingDoc,
    testimonialText: validation.text,
    rating: validation.rating,
    // Critical moderation rule: Resets to pending when edited
    status: "pending",
    showOnHomepage: false,
    isFeatured: false,
    rejectionReason: "",
    approvedAt: undefined,
    approvedBy: undefined
  };
}

// Admin approval helper
function adminApproveTestimonial(adminUser, existingDoc, showOnHomepage = true) {
  return {
    ...existingDoc,
    status: "approved",
    showOnHomepage: Boolean(showOnHomepage),
    approvedAt: new Date(),
    approvedBy: adminUser._id,
    approvedByName: adminUser.name,
    rejectionReason: ""
  };
}

// Admin homepage toggle helper
function adminToggleHomepage(existingDoc) {
  if (existingDoc.status !== "approved" && existingDoc.status !== "active") {
    throw new Error("Only approved testimonials can be published to the homepage.");
  }
  return {
    ...existingDoc,
    showOnHomepage: !existingDoc.showOnHomepage
  };
}

// Stats calculation helper
function calculateTestimonialStats(testimonials) {
  const total = testimonials.length;
  const pending = testimonials.filter((t) => t.status === "pending").length;
  const approved = testimonials.filter((t) => t.status === "approved" || t.status === "active").length;
  const rejected = testimonials.filter((t) => t.status === "rejected").length;
  const published = testimonials.filter((t) => (t.status === "approved" || t.status === "active") && t.showOnHomepage).length;

  const approvedList = testimonials.filter((t) => t.status === "approved" || t.status === "active");
  const avgRating = approvedList.length > 0
    ? Number((approvedList.reduce((sum, t) => sum + t.rating, 0) / approvedList.length).toFixed(1))
    : 5.0;

  return { total, pending, approved, rejected, published, averageRating: avgRating };
}

test("Rating Validation: Accepts integers 1 to 5, rejects invalid numbers", () => {
  const validCases = [1, 2, 3, 4, 5];
  for (const rating of validCases) {
    const res = validateTestimonialInput({ rating, testimonialText: "This is a valid long enough testimonial text!" });
    assert.equal(res.valid, true);
    assert.equal(res.rating, rating);
  }

  const invalidCases = [0, 6, 7, -1, 4.5, 3.7, null, undefined, "abc"];
  for (const rating of invalidCases) {
    const res = validateTestimonialInput({ rating, testimonialText: "This is a valid long enough testimonial text!" });
    assert.equal(res.valid, false);
    assert.equal(res.error, "Please select a rating from 1 to 5 stars.");
  }
});

test("Testimonial Text Validation: Enforces required, min 20, max 1000 characters", () => {
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: "" }).valid, false);
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: "   " }).valid, false);
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: "Too short" }).valid, false);
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: "1234567890123456789" }).valid, false); // 19 chars

  // Exactly 20 chars
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: "12345678901234567890" }).valid, true);

  // Over 1000 chars
  const text1001 = "a".repeat(1001);
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: text1001 }).valid, false);

  // 1000 chars exactly
  const text1000 = "a".repeat(1000);
  assert.equal(validateTestimonialInput({ rating: 5, testimonialText: text1000 }).valid, true);
});

test("Moderation Flow: Student submission defaults to pending & not published", () => {
  const student = { _id: "student-1", name: "Gaurav", email: "gaurav@example.com" };
  const doc = createStudentSubmission(student, {
    rating: 5,
    testimonialText: "The Sunday classes transformed my daily routine and focus."
  });

  assert.equal(doc.status, "pending");
  assert.equal(doc.showOnHomepage, false);
  assert.equal(doc.isFeatured, false);
  assert.equal(doc.userId, "student-1");
});

test("Moderation Flow: Editing an approved testimonial resets status to pending", () => {
  const student = { _id: "student-1", name: "Gaurav", email: "gaurav@example.com" };
  const admin = { _id: "admin-1", name: "Admin Gopal" };

  let doc = createStudentSubmission(student, {
    rating: 5,
    testimonialText: "The Sunday classes transformed my daily routine and focus."
  });
  doc = adminApproveTestimonial(admin, doc, true);
  assert.equal(doc.status, "approved");
  assert.equal(doc.showOnHomepage, true);

  // Student edits the approved testimonial
  doc = updateStudentSubmission(student, doc, {
    rating: 4,
    testimonialText: "Updated reflection with new thoughts on meditation."
  });

  // Must now be pending and unpublished
  assert.equal(doc.status, "pending");
  assert.equal(doc.showOnHomepage, false);
  assert.equal(doc.isFeatured, false);
});

test("Security: Other students cannot edit another user's testimonial", () => {
  const owner = { _id: "student-1", name: "Gaurav" };
  const intruder = { _id: "student-2", name: "Intruder" };

  const doc = createStudentSubmission(owner, {
    rating: 5,
    testimonialText: "Original student review from legitimate owner."
  });

  assert.throws(
    () => updateStudentSubmission(intruder, doc, { rating: 1, testimonialText: "Hacked testimonial text." }),
    /Unauthorized/
  );
});

test("Homepage Publishing Guard: Only approved testimonials can be published to homepage", () => {
  const pendingDoc = { status: "pending", showOnHomepage: false };
  assert.throws(() => adminToggleHomepage(pendingDoc), /Only approved testimonials/);

  const rejectedDoc = { status: "rejected", showOnHomepage: false };
  assert.throws(() => adminToggleHomepage(rejectedDoc), /Only approved testimonials/);

  const approvedDoc = { status: "approved", showOnHomepage: false };
  const publishedDoc = adminToggleHomepage(approvedDoc);
  assert.equal(publishedDoc.showOnHomepage, true);
});

test("Statistics Aggregator: Correctly computes total, pending, approved, rejected, and average rating", () => {
  const sample = [
    { rating: 5, status: "approved", showOnHomepage: true },
    { rating: 4, status: "approved", showOnHomepage: true },
    { rating: 5, status: "approved", showOnHomepage: false },
    { rating: 5, status: "pending", showOnHomepage: false },
    { rating: 2, status: "rejected", showOnHomepage: false }
  ];

  const stats = calculateTestimonialStats(sample);
  assert.equal(stats.total, 5);
  assert.equal(stats.approved, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.published, 2);
  // (5 + 4 + 5) / 3 = 14 / 3 = 4.666... -> 4.7
  assert.equal(stats.averageRating, 4.7);
});
