import test from "node:test";
import assert from "node:assert/strict";

// Mirror map embed URL normalizer for testing
function normalizeMapEmbedUrl(input) {
  if (!input || !String(input).trim()) {
    return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.015099395029!2d72.82361497607736!3d19.107005450995572!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9b888200f6f%3A0xe54d6faebad74e4c!2sISKCON%20Juhu!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin";
  }
  const trimmed = String(input).trim();
  const iframeMatch = trimmed.match(/<iframe\s+[^>]*src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1];
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

// Validate WhatsApp number normalization
function formatWhatsAppUrl(phoneNumber, message) {
  const cleanPhone = (phoneNumber || "").replace(/\D/g, "");
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const text = encodeURIComponent(message || "Hare Krishna!");
  return `https://wa.me/${fullPhone}?text=${text}`;
}

test("Google Maps URL Normalization: Direct URL preserved", () => {
  const url = "https://www.google.com/maps/embed?pb=test-direct";
  assert.equal(normalizeMapEmbedUrl(url), url);
});

test("Google Maps URL Normalization: Extracts src from iframe embed tag", () => {
  const embedCode = '<iframe src="https://www.google.com/maps/embed?pb=test-iframe" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';
  assert.equal(normalizeMapEmbedUrl(embedCode), "https://www.google.com/maps/embed?pb=test-iframe");
});

test("Google Maps URL Normalization: Converts raw search string to embed query", () => {
  const rawQuery = "ISKCON Juhu Mumbai";
  const expected = "https://maps.google.com/maps?q=ISKCON%20Juhu%20Mumbai&t=&z=15&ie=UTF8&iwloc=&output=embed";
  assert.equal(normalizeMapEmbedUrl(rawQuery), expected);
});

test("Google Maps URL Normalization: Empty or null returns default ISKCON Juhu map", () => {
  const defaultUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.015099395029!2d72.82361497607736!3d19.107005450995572!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9b888200f6f%3A0xe54d6faebad74e4c!2sISKCON%20Juhu!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin";
  assert.equal(normalizeMapEmbedUrl(""), defaultUrl);
  assert.equal(normalizeMapEmbedUrl(null), defaultUrl);
});

test("WhatsApp URL Generation: Normalizes 8928337055 to wa.me/918928337055", () => {
  const url = formatWhatsAppUrl("8928337055", "Hello");
  assert.equal(url, "https://wa.me/918928337055?text=Hello");

  const formattedUrl = formatWhatsAppUrl("+91 89283-37055", "Hare Krishna");
  assert.equal(formattedUrl, "https://wa.me/918928337055?text=Hare%20Krishna");
});
