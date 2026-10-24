import { BookAuditLog } from "./models.js";

/**
 * Decimal-safe rounding half-up to 2 decimal places
 */
export const round2 = (num) => {
  const val = Number(num || 0);
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Calculates pricing for a book order
 * Recomputed and validated on the server for security
 */
export const calculateBookQuote = ({
  book,
  orderType,
  quantity,
  shippingFee = 0
}) => {
  if (!book) throw new Error("Book is required");
  if (!orderType || !["BUY", "DISTRIBUTE"].includes(orderType)) {
    throw new Error("Invalid order type. Must be BUY or DISTRIBUTE.");
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }

  // Min / Max validation
  const minQty = orderType === "BUY" ? (book.minBuyQty || 1) : (book.minDistributeQty || 1);
  const maxQty = orderType === "BUY" ? (book.maxBuyQty || 100) : (book.maxDistributeQty || 100000);

  if (qty < minQty) {
    throw new Error(`Minimum quantity for ${orderType} is ${minQty}.`);
  }
  if (qty > maxQty) {
    throw new Error(`Maximum quantity for ${orderType} is ${maxQty}.`);
  }

  // Unit price
  let unitPrice = 0;
  if (orderType === "DISTRIBUTE") {
    unitPrice = (typeof book.distributionPricePerBook === "number" && book.distributionPricePerBook > 0)
      ? book.distributionPricePerBook
      : book.pricePerBook;
  } else {
    unitPrice = book.pricePerBook;
  }
  unitPrice = round2(unitPrice);

  const subtotal = round2(qty * unitPrice);
  const gstPercent = round2(book.gstPercent || 0);
  const gstAmount = round2((subtotal * gstPercent) / 100);
  const shipping = orderType === "BUY" ? round2(shippingFee || 0) : 0;
  const totalAmount = round2(subtotal + gstAmount + shipping);

  return {
    unitPrice,
    subtotal,
    gstPercent,
    gstAmount,
    shippingFee: shipping,
    totalAmount
  };
};

/**
 * Order status transition state machine
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  PENDING_PAYMENT: ["PAYMENT_SUBMITTED", "CANCELLED"],
  PAYMENT_SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  REJECTED: ["PAYMENT_SUBMITTED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export const canTransitionStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
};

/**
 * Generate sequential order numbers per year: BK-YYYY-XXXXXX
 */
export const generateOrderNumber = async (BookOrderModel) => {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;
  
  // Find highest existing order number for this year
  const latest = await BookOrderModel.findOne({ orderNumber: new RegExp(`^${prefix}`) })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean();

  let nextSeq = 1;
  if (latest?.orderNumber) {
    const parts = latest.orderNumber.split("-");
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) nextSeq = numPart + 1;
  }

  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
};

/**
 * Audit log recorder for Books module
 */
export const logBookAudit = async ({
  entityType,
  entityId,
  action,
  oldValue = null,
  newValue = null,
  performedBy = null,
  performerName = "",
  performerRole = "",
  note = ""
}) => {
  try {
    await BookAuditLog.create({
      entityType,
      entityId: String(entityId),
      action,
      oldValue,
      newValue,
      performedBy,
      performerName,
      performerRole,
      note
    });
  } catch (err) {
    console.error("[book-audit-log-error]", err);
  }
};

/**
 * CSV safety: sanitize cells starting with formula triggers (=, +, -, @)
 */
export const sanitizeCsvCell = (str = "") => {
  const val = String(str || "");
  if (/^[=+\-@]/.test(val)) {
    return `'${val}`;
  }
  return val;
};
