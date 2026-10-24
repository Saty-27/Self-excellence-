import test from "node:test";
import assert from "node:assert/strict";
import {
  round2,
  calculateBookQuote,
  canTransitionStatus,
  sanitizeCsvCell
} from "../src/booksService.js";

test("Pricing Test Case 1: 10 books × ₹150 with 0% GST", () => {
  const book = { pricePerBook: 150, gstPercent: 0, minBuyQty: 1, maxBuyQty: 100 };
  const quote = calculateBookQuote({ book, orderType: "BUY", quantity: 10 });
  assert.equal(quote.unitPrice, 150);
  assert.equal(quote.subtotal, 1500.00);
  assert.equal(quote.gstAmount, 0.00);
  assert.equal(quote.totalAmount, 1500.00);
});

test("Pricing Test Case 2: 10 books × ₹150 with 5% GST", () => {
  const book = { pricePerBook: 150, gstPercent: 5, minBuyQty: 1, maxBuyQty: 100 };
  const quote = calculateBookQuote({ book, orderType: "BUY", quantity: 10 });
  assert.equal(quote.unitPrice, 150);
  assert.equal(quote.subtotal, 1500.00);
  assert.equal(quote.gstAmount, 75.00);
  assert.equal(quote.totalAmount, 1575.00);
});

test("Pricing Test Case 3: 3 books × ₹149.99 with 12% GST (decimal rounding)", () => {
  const book = { pricePerBook: 149.99, gstPercent: 12, minBuyQty: 1, maxBuyQty: 100 };
  const quote = calculateBookQuote({ book, orderType: "BUY", quantity: 3 });
  assert.equal(quote.unitPrice, 149.99);
  assert.equal(quote.subtotal, 449.97);
  // 449.97 * 0.12 = 53.9964 => rounds half-up to 54.00
  assert.equal(quote.gstAmount, 54.00);
  assert.equal(quote.totalAmount, 503.97);
});

test("Pricing Test Case 4: Invalid quantities are rejected with clear messages", () => {
  const book = { pricePerBook: 150, gstPercent: 0, minBuyQty: 1, maxBuyQty: 100 };
  assert.throws(() => calculateBookQuote({ book, orderType: "BUY", quantity: 0 }), /Quantity must be a positive integer/);
  assert.throws(() => calculateBookQuote({ book, orderType: "BUY", quantity: -5 }), /Quantity must be a positive integer/);
  assert.throws(() => calculateBookQuote({ book, orderType: "BUY", quantity: "abc" }), /Quantity must be a positive integer/);
  assert.throws(() => calculateBookQuote({ book, orderType: "BUY", quantity: "" }), /Quantity must be a positive integer/);
  assert.throws(() => calculateBookQuote({ book, orderType: "BUY", quantity: 101 }), /Maximum quantity for BUY is 100/);
});

test("Pricing Test Case 5: Distribute pricing uses distributionPricePerBook when set", () => {
  const book = { pricePerBook: 200, distributionPricePerBook: 180, gstPercent: 5, minDistributeQty: 10, maxDistributeQty: 10000 };
  const quote = calculateBookQuote({ book, orderType: "DISTRIBUTE", quantity: 100 });
  assert.equal(quote.unitPrice, 180);
  assert.equal(quote.subtotal, 18000.00);
  assert.equal(quote.gstAmount, 900.00);
  assert.equal(quote.totalAmount, 18900.00);
});

test("Status Transitions: Allowed transitions vs illegal jumps", () => {
  // Allowed
  assert.equal(canTransitionStatus("PENDING_PAYMENT", "PAYMENT_SUBMITTED"), true);
  assert.equal(canTransitionStatus("PAYMENT_SUBMITTED", "APPROVED"), true);
  assert.equal(canTransitionStatus("PAYMENT_SUBMITTED", "REJECTED"), true);
  assert.equal(canTransitionStatus("REJECTED", "PAYMENT_SUBMITTED"), true);
  assert.equal(canTransitionStatus("APPROVED", "COMPLETED"), true);
  assert.equal(canTransitionStatus("PENDING_PAYMENT", "CANCELLED"), true);

  // Illegal jumps
  assert.equal(canTransitionStatus("PENDING_PAYMENT", "COMPLETED"), false);
  assert.equal(canTransitionStatus("PENDING_PAYMENT", "APPROVED"), false);
  assert.equal(canTransitionStatus("COMPLETED", "CANCELLED"), false);
  assert.equal(canTransitionStatus("CANCELLED", "APPROVED"), false);
});

test("Security: CSV injection prevention", () => {
  assert.equal(sanitizeCsvCell("Normal Name"), "Normal Name");
  assert.equal(sanitizeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(sanitizeCsvCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(sanitizeCsvCell("-100"), "'-100");
  assert.equal(sanitizeCsvCell("@alert(1)"), "'@alert(1)");
});

test("Snapshot Integrity: Order creation freezes unit price and GST snapshot", () => {
  const initialBook = { pricePerBook: 150, gstPercent: 5, minBuyQty: 1, maxBuyQty: 100 };
  const orderQuote = calculateBookQuote({ book: initialBook, orderType: "BUY", quantity: 2 });
  
  // Simulate order snapshot record
  const orderRecord = {
    unitPriceSnapshot: orderQuote.unitPrice,
    gstPercentSnapshot: orderQuote.gstPercent,
    subtotal: orderQuote.subtotal,
    totalAmount: orderQuote.totalAmount
  };

  // Admin later changes book price to ₹250 and GST to 18%
  initialBook.pricePerBook = 250;
  initialBook.gstPercent = 18;

  // The order's snapshot must remain strictly unchanged
  assert.equal(orderRecord.unitPriceSnapshot, 150);
  assert.equal(orderRecord.gstPercentSnapshot, 5);
  assert.equal(orderRecord.totalAmount, 315.00);
});
