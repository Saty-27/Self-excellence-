import test from "node:test";
import assert from "node:assert/strict";

// Mirror journey business logic helpers for unit testing

function generateRouteText(startingLocation, destination, returnLocation) {
  const start = (startingLocation || "").trim() || "Mumbai";
  const dest = (destination || "").trim() || "Vrindavana";
  const ret = (returnLocation || "").trim() || start;
  return `${start} → ${dest} → ${ret}`;
}

function computeJourneyTotal({ basePrice = 0, participants = 1, addOns = [], discountPrice }) {
  const effectivePrice = typeof discountPrice === "number" && discountPrice > 0 && discountPrice < basePrice
    ? discountPrice
    : basePrice;
  const count = Math.max(1, parseInt(participants, 10) || 1);
  const baseSubtotal = effectivePrice * count;
  const addOnsTotal = (addOns || []).reduce((sum, item) => sum + (Number(item?.price) || 0) * count, 0);
  return {
    effectivePrice,
    count,
    baseSubtotal,
    addOnsTotal,
    total: baseSubtotal + addOnsTotal
  };
}

function validateJourneyStatus(status) {
  const valid = ["draft", "published", "archived"];
  return valid.includes(status) ? status : "draft";
}

function enforceSingleFeatured(journeys, featuredId) {
  return journeys.map((j) => ({
    ...j,
    isFeatured: String(j._id) === String(featuredId)
  }));
}

test("Route Generation: Generates clean 3-point route with arrows", () => {
  const route = generateRouteText("ISKCON Juhu", "Vrindavana", "ISKCON Juhu");
  assert.equal(route, "ISKCON Juhu → Vrindavana → ISKCON Juhu");
});

test("Route Generation: Falls back to starting location when return location is omitted", () => {
  const route = generateRouteText("Mumbai", "Mayapur", "");
  assert.equal(route, "Mumbai → Mayapur → Mumbai");
});

test("Pricing Calculation: Correctly computes 2 participants at ₹18,500 = ₹37,000", () => {
  const quote = computeJourneyTotal({ basePrice: 18500, participants: 2 });
  assert.equal(quote.effectivePrice, 18500);
  assert.equal(quote.count, 2);
  assert.equal(quote.baseSubtotal, 37000);
  assert.equal(quote.total, 37000);
});

test("Pricing Calculation: Honors discountPrice when valid", () => {
  const quote = computeJourneyTotal({ basePrice: 18500, discountPrice: 16500, participants: 3 });
  assert.equal(quote.effectivePrice, 16500);
  assert.equal(quote.total, 49500);
});

test("Pricing Calculation: Includes optional add-ons multiplied by participants", () => {
  const quote = computeJourneyTotal({
    basePrice: 18500,
    participants: 2,
    addOns: [{ title: "Special Yamuna Boat Puja", price: 1500 }]
  });
  assert.equal(quote.baseSubtotal, 37000);
  assert.equal(quote.addOnsTotal, 3000);
  assert.equal(quote.total, 40000);
});

test("Status Validation: Only allows draft, published, and archived", () => {
  assert.equal(validateJourneyStatus("published"), "published");
  assert.equal(validateJourneyStatus("draft"), "draft");
  assert.equal(validateJourneyStatus("archived"), "archived");
  assert.equal(validateJourneyStatus("unknown"), "draft");
});

test("Featured Enforcement: Guarantees exactly one journey is featured", () => {
  const list = [
    { _id: "1", title: "Vrindavan", isFeatured: true },
    { _id: "2", title: "Jagannath Puri", isFeatured: false },
    { _id: "3", title: "Mayapur", isFeatured: false }
  ];
  const updated = enforceSingleFeatured(list, "2");
  assert.equal(updated.find((j) => j._id === "1").isFeatured, false);
  assert.equal(updated.find((j) => j._id === "2").isFeatured, true);
  assert.equal(updated.filter((j) => j.isFeatured).length, 1);
});
