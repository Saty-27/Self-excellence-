import express from "express";
import {
  Book,
  BookOrder,
  BookPaymentSetting,
  BookAuditLog,
  Pilgrimage,
  User,
  Notification
} from "./models.js";
import {
  round2,
  calculateBookQuote,
  canTransitionStatus,
  generateOrderNumber,
  logBookAudit,
  sanitizeCsvCell
} from "./booksService.js";
import { isBooksEnabled } from "./booksConfig.js";

export const booksRouter = express.Router();

/* Feature flag check middleware for all books routes */
const checkBooksEnabled = (req, res, next) => {
  if (!isBooksEnabled()) {
    return res.status(404).json({ success: false, message: "Books feature is currently unavailable" });
  }
  next();
};

booksRouter.use(checkBooksEnabled);

/* Helper to get payment details (falling back to Pilgrimage if configured) */
async function getEffectivePaymentSettings() {
  let settings = await BookPaymentSetting.findOne({ singletonKey: "default_book_settings" }).lean();
  if (!settings) {
    settings = {
      upiId: "",
      upiPayeeName: "ISKCON Juhu",
      qrCodeImage: "",
      bankAccountHolder: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankName: "",
      bankBranch: "",
      extraInstructions: "",
      defaultGstPercent: 0,
      shippingFeeEnabled: false,
      shippingFeeAmount: 0,
      useTripPaymentDetails: true
    };
  }

  // If useTripPaymentDetails is enabled and book UPI/Bank is empty, copy from active Pilgrimage
  if (settings.useTripPaymentDetails && (!settings.upiId || !settings.bankAccountNumber)) {
    const trip = await Pilgrimage.findOne({ status: "active", upiId: { $ne: "" } }).lean();
    if (trip) {
      if (!settings.upiId) settings.upiId = trip.upiId || "";
      if (!settings.qrCodeImage) settings.qrCodeImage = trip.paymentQrImage || "";
      if (!settings.bankAccountHolder) settings.bankAccountHolder = trip.bankAccountName || "";
      if (!settings.bankAccountNumber) settings.bankAccountNumber = trip.bankAccountNumber || "";
      if (!settings.bankIfsc) settings.bankIfsc = trip.bankIfsc || "";
      if (!settings.bankName) settings.bankName = trip.bankName || "";
      if (!settings.bankBranch) settings.bankBranch = trip.bankBranch || "";
      if (!settings.contactPhone) settings.contactPhone = trip.paymentContactNumber || "";
    }
  }

  return settings;
}

const slugify = (val = "") =>
  val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ============================================================
   6.1 PUBLIC ROUTES (No Login Required)
   ============================================================ */

/**
 * GET /api/books — list active books ordered by display_order
 */
booksRouter.get("/books", async (req, res) => {
  try {
    const books = await Book.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .select("slug title subtitle shortDescription coverImage pricePerBook mrp allowBuy allowDistribute distributionPresets displayOrder")
      .lean();

    res.json({ success: true, items: books });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/books/payment-info — public payment info (UPI, QR, Bank, instructions)
 */
booksRouter.get("/books/payment-info", async (req, res) => {
  try {
    const settings = await getEffectivePaymentSettings();
    res.json({
      success: true,
      settings: {
        upiId: settings.upiId || "",
        upiPayeeName: settings.upiPayeeName || "ISKCON Juhu",
        qrCodeImage: settings.qrCodeImage || "",
        bankAccountHolder: settings.bankAccountHolder || "",
        bankAccountNumber: settings.bankAccountNumber || "",
        bankIfsc: settings.bankIfsc || "",
        bankName: settings.bankName || "",
        bankBranch: settings.bankBranch || "",
        extraInstructions: settings.extraInstructions || "",
        defaultGstPercent: settings.defaultGstPercent || 0,
        shippingFeeEnabled: Boolean(settings.shippingFeeEnabled),
        shippingFeeAmount: settings.shippingFeeAmount || 0,
        contactPhone: settings.contactPhone || "",
        contactEmail: settings.contactEmail || "",
        configured: Boolean(settings.upiId || settings.bankAccountNumber)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/books/quote — live pricing calculation preview
 */
booksRouter.post("/books/quote", async (req, res) => {
  try {
    const { bookId, orderType, quantity } = req.body;
    if (!bookId) return res.status(400).json({ success: false, message: "bookId is required" });

    const book = await Book.findById(bookId).lean();
    if (!book || !book.isActive) {
      return res.status(404).json({ success: false, message: "Book not found or currently unavailable" });
    }

    if (orderType === "BUY" && !book.allowBuy) {
      return res.status(400).json({ success: false, message: "Buying is not available for this book" });
    }
    if (orderType === "DISTRIBUTE" && !book.allowDistribute) {
      return res.status(400).json({ success: false, message: "Distribution seva is not available for this book" });
    }

    const settings = await getEffectivePaymentSettings();
    const shippingFee = (orderType === "BUY" && settings.shippingFeeEnabled) ? settings.shippingFeeAmount : 0;

    const quote = calculateBookQuote({
      book,
      orderType,
      quantity,
      shippingFee
    });

    res.json({ success: true, quote });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/books/:slug — full details of one book
 */
booksRouter.get("/books/:slug", async (req, res) => {
  try {
    const filter = { slug: req.params.slug.toLowerCase().trim() };
    const book = await Book.findOne(filter).lean();
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    if (!book.isActive) {
      return res.status(404).json({ success: false, message: "This book is currently unavailable." });
    }

    const settings = await getEffectivePaymentSettings();
    const effectiveGst = (typeof book.gstPercent === "number") ? book.gstPercent : (settings.defaultGstPercent || 0);

    res.json({
      success: true,
      book: {
        ...book,
        gstPercent: effectiveGst,
        shippingFee: (settings.shippingFeeEnabled ? settings.shippingFeeAmount : 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   6.2 LOGGED-IN USER ROUTES (protect middleware required)
   ============================================================ */

export function attachProtectedBookRoutes(app, protectMiddleware) {
  /**
   * POST /api/book-orders — create an order (BUY or DISTRIBUTE)
   */
  app.post("/api/book-orders", protectMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const {
        bookId,
        orderType,
        quantity,
        contactName,
        contactPhone,
        contactEmail,
        deliveryAddress = {},
        dedicationName = "",
        dedicationMessage = ""
      } = req.body;

      if (!bookId || !orderType || !quantity) {
        return res.status(400).json({ success: false, message: "Missing required order parameters." });
      }

      const book = await Book.findById(bookId);
      if (!book || !book.isActive) {
        return res.status(404).json({ success: false, message: "Book not found or currently inactive." });
      }

      if (orderType === "BUY" && !book.allowBuy) {
        return res.status(400).json({ success: false, message: "Buying is not available for this book." });
      }
      if (orderType === "DISTRIBUTE" && !book.allowDistribute) {
        return res.status(400).json({ success: false, message: "Distribution is not available for this book." });
      }

      // BUY delivery address validation
      if (orderType === "BUY") {
        if (!deliveryAddress.line1?.trim() || !deliveryAddress.city?.trim() || !deliveryAddress.state?.trim() || !deliveryAddress.pincode?.trim()) {
          return res.status(400).json({ success: false, message: "Complete delivery address (line 1, city, state, pincode) is required for book delivery." });
        }
      }

      const settings = await getEffectivePaymentSettings();
      const shippingFee = (orderType === "BUY" && settings.shippingFeeEnabled) ? settings.shippingFeeAmount : 0;

      // Recalculate price on the server
      const quote = calculateBookQuote({
        book,
        orderType,
        quantity,
        shippingFee
      });

      // Stock check for BUY if tracking is on
      if (orderType === "BUY" && book.trackStock && book.stockQuantity < parseInt(quantity, 10)) {
        return res.status(400).json({ success: false, message: `Only ${book.stockQuantity} copies remaining in stock.` });
      }

      const orderNumber = await generateOrderNumber(BookOrder);

      const order = await BookOrder.create({
        orderNumber,
        user: req.user._id,
        book: book._id,
        orderType,
        bookTitleSnapshot: book.title,
        unitPriceSnapshot: quote.unitPrice,
        gstPercentSnapshot: quote.gstPercent,
        quantity: parseInt(quantity, 10),
        subtotal: quote.subtotal,
        gstAmount: quote.gstAmount,
        shippingFee: quote.shippingFee,
        totalAmount: quote.totalAmount,
        currency: "INR",
        status: "PENDING_PAYMENT",
        contactName: contactName || req.user.name,
        contactPhone: contactPhone || req.user.phone || req.user.mobile,
        contactEmail: contactEmail || req.user.email,
        deliveryAddress: orderType === "BUY" ? {
          line1: deliveryAddress.line1?.trim() || "",
          line2: deliveryAddress.line2?.trim() || "",
          city: deliveryAddress.city?.trim() || "",
          state: deliveryAddress.state?.trim() || "",
          pincode: deliveryAddress.pincode?.trim() || "",
          landmark: deliveryAddress.landmark?.trim() || ""
        } : undefined,
        dedicationName: orderType === "DISTRIBUTE" ? (dedicationName?.trim() || "") : undefined,
        dedicationMessage: orderType === "DISTRIBUTE" ? (dedicationMessage?.trim() || "") : undefined
      });

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "CREATED",
        newValue: { orderNumber: order.orderNumber, totalAmount: order.totalAmount, status: order.status },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Order ${order.orderNumber} created (${orderType})`
      });

      res.status(201).json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /api/book-orders/:id/payment — submit payment proof (screenshot & reference)
   */
  app.post("/api/book-orders/:id/payment", protectMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      // Ownership check
      if (String(order.user) !== String(req.user._id) && req.user.role !== "main_admin") {
        return res.status(403).json({ success: false, message: "You are not authorized to update this order" });
      }

      if (!["PENDING_PAYMENT", "REJECTED"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot submit payment proof for an order with status: ${order.status}`
        });
      }

      const { paymentPhotoUrl, payerName, transactionReference } = req.body;
      if (!paymentPhotoUrl) {
        return res.status(400).json({ success: false, message: "Payment screenshot receipt is required." });
      }

      const previousStatus = order.status;
      order.paymentPhotoUrl = paymentPhotoUrl;
      if (payerName) order.payerName = payerName.trim();
      if (transactionReference) order.transactionReference = transactionReference.trim();
      order.status = "PAYMENT_SUBMITTED";
      order.paymentSubmittedAt = new Date();
      order.rejectionReason = ""; // Clear rejection on re-upload

      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "SCREENSHOT_UPLOADED",
        oldValue: { status: previousStatus },
        newValue: { status: order.status, paymentPhotoUrl, transactionReference },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Payment proof submitted for ${order.orderNumber}`
      });

      // Send in-app notification to admins
      await Notification.create({
        audience: "admin",
        type: "book_order_submitted",
        title: "New Book Order Payment to Verify",
        message: `${order.contactName} submitted proof for ${order.orderNumber} (₹${order.totalAmount})`,
        link: `/admin/book-orders?search=${order.orderNumber}`
      }).catch(() => null);

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  /**
   * GET /api/book-orders/mine — logged-in user's orders
   */
  app.get("/api/book-orders/mine", protectMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const filter = { user: req.user._id };
      if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
      if (req.query.type && req.query.type !== "all") filter.orderType = req.query.type;

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);

      const [items, total] = await Promise.all([
        BookOrder.find(filter)
          .populate("book", "title slug coverImage authorOrTranslator")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        BookOrder.countDocuments(filter)
      ]);

      res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * GET /api/book-orders/:id — single order detail (owner or admin)
   */
  app.get("/api/book-orders/:id", protectMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const order = await BookOrder.findById(req.params.id)
        .populate("book", "title slug coverImage authorOrTranslator")
        .populate("user", "name email phone")
        .lean();

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      const isOwner = String(order.user?._id || order.user) === String(req.user._id);
      const isAdmin = ["main_admin", "admin", "manager"].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /api/book-orders/:id/cancel — user cancellation while PENDING_PAYMENT
   */
  app.post("/api/book-orders/:id/cancel", protectMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (String(order.user) !== String(req.user._id) && req.user.role !== "main_admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      if (order.status !== "PENDING_PAYMENT") {
        return res.status(400).json({ success: false, message: "Only orders pending payment may be cancelled by the user." });
      }

      order.status = "CANCELLED";
      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "STATUS_CHANGED",
        oldValue: { status: "PENDING_PAYMENT" },
        newValue: { status: "CANCELLED" },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Cancelled by user`
      });

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });
}

/* ============================================================
   6.3 ADMIN ROUTES (adminOnly middleware required)
   ============================================================ */

export function attachAdminBookRoutes(app, adminOnlyMiddleware) {
  // Books CRUD
  app.get("/api/admin/books", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const items = await Book.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
      res.json({ success: true, items });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/books", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const payload = { ...req.body };
      if (!payload.title?.trim()) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      if (!payload.slug?.trim()) {
        payload.slug = slugify(payload.title);
      } else {
        payload.slug = slugify(payload.slug);
      }

      // Check unique slug
      const existing = await Book.findOne({ slug: payload.slug });
      if (existing) {
        return res.status(400).json({ success: false, message: "A book with this slug already exists" });
      }

      const book = await Book.create(payload);

      await logBookAudit({
        entityType: "BOOK",
        entityId: book._id,
        action: "CREATED",
        newValue: book.toObject(),
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Created book ${book.title}`
      });

      res.status(201).json({ success: true, book });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.get("/api/admin/books/:id", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const book = await Book.findById(req.params.id).lean();
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });
      res.json({ success: true, book });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put("/api/admin/books/:id", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });

      const oldObj = book.toObject();
      const payload = { ...req.body };
      if (payload.title && !payload.slug) payload.slug = slugify(payload.title);
      if (payload.slug) {
        payload.slug = slugify(payload.slug);
        const duplicate = await Book.findOne({ slug: payload.slug, _id: { $ne: book._id } });
        if (duplicate) return res.status(400).json({ success: false, message: "Slug is already used by another book" });
      }

      const priceChanged = payload.pricePerBook !== undefined && payload.pricePerBook !== book.pricePerBook;

      Object.assign(book, payload);
      await book.save();

      await logBookAudit({
        entityType: "BOOK",
        entityId: book._id,
        action: priceChanged ? "PRICE_CHANGED" : "UPDATED",
        oldValue: oldObj,
        newValue: book.toObject(),
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: priceChanged ? `Price changed to ₹${book.pricePerBook}` : `Updated book ${book.title}`
      });

      res.json({ success: true, book, priceChanged });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/admin/books/:id", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });

      // Non-deletion rule: if book has orders, reject with message
      const ordersCount = await BookOrder.countDocuments({ book: book._id });
      if (ordersCount > 0) {
        return res.status(400).json({
          success: false,
          message: `This book has ${ordersCount} order(s). Deactivate it instead of deleting.`
        });
      }

      await Book.findByIdAndDelete(book._id);

      await logBookAudit({
        entityType: "BOOK",
        entityId: book._id,
        action: "DELETED",
        oldValue: book.toObject(),
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Deleted book ${book.title}`
      });

      res.json({ success: true, message: "Book deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/books/reorder", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const { orderedIds = [] } = req.body;
      await Promise.all(
        orderedIds.map((id, index) => Book.findByIdAndUpdate(id, { displayOrder: index }))
      );
      res.json({ success: true, message: "Reordered successfully" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/books/:id/toggle-active", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });

      book.isActive = !book.isActive;
      await book.save();

      await logBookAudit({
        entityType: "BOOK",
        entityId: book._id,
        action: "STATUS_CHANGED",
        newValue: { isActive: book.isActive },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Set active = ${book.isActive}`
      });

      res.json({ success: true, isActive: book.isActive });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Admin Book Orders
  app.get("/api/admin/book-orders", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const filter = {};
      if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
      if (req.query.type && req.query.type !== "all") filter.orderType = req.query.type;
      if (req.query.bookId && req.query.bookId !== "all") filter.book = req.query.bookId;

      if (req.query.search) {
        const regex = new RegExp(req.query.search, "i");
        filter.$or = [
          { orderNumber: regex },
          { contactName: regex },
          { contactPhone: regex },
          { contactEmail: regex },
          { transactionReference: regex }
        ];
      }

      if (req.query.dateFrom || req.query.dateTo) {
        filter.createdAt = {};
        if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) {
          const to = new Date(req.query.dateTo);
          to.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = to;
        }
      }

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);

      const [items, total] = await Promise.all([
        BookOrder.find(filter)
          .populate("book", "title slug coverImage")
          .populate("user", "name email phone")
          .populate("verifiedBy", "name")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        BookOrder.countDocuments(filter)
      ]);

      res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/admin/book-orders/summary", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [pendingVerifications, ordersToday, buyStats, distStats] = await Promise.all([
        BookOrder.countDocuments({ status: "PAYMENT_SUBMITTED" }),
        BookOrder.countDocuments({ createdAt: { $gte: todayStart } }),
        BookOrder.aggregate([
          { $match: { orderType: "BUY", status: { $in: ["APPROVED", "COMPLETED"] } } },
          { $group: { _id: null, copies: { $sum: "$quantity" }, amount: { $sum: "$totalAmount" } } }
        ]),
        BookOrder.aggregate([
          { $match: { orderType: "DISTRIBUTE", status: { $in: ["APPROVED", "COMPLETED"] } } },
          { $group: { _id: null, copies: { $sum: "$quantity" }, amount: { $sum: "$totalAmount" } } }
        ])
      ]);

      const totalCopiesBuy = buyStats[0]?.copies || 0;
      const totalCopiesDistribute = distStats[0]?.copies || 0;
      const totalVerifiedAmount = round2((buyStats[0]?.amount || 0) + (distStats[0]?.amount || 0));

      res.json({
        success: true,
        summary: {
          pendingVerifications,
          ordersToday,
          totalCopiesBuy,
          totalCopiesDistribute,
          totalVerifiedAmount
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/admin/book-orders/:id", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const order = await BookOrder.findById(req.params.id)
        .populate("book")
        .populate("user", "name email phone role")
        .populate("verifiedBy", "name email")
        .lean();

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      // Fetch audit history
      const history = await BookAuditLog.find({ entityType: "ORDER", entityId: String(order._id) })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, order, history });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/book-orders/:id/approve", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (!canTransitionStatus(order.status, "APPROVED")) {
        return res.status(400).json({ success: false, message: `Cannot approve order from status: ${order.status}` });
      }

      const prevStatus = order.status;
      order.status = "APPROVED";
      order.verifiedBy = req.user._id;
      order.verifiedAt = new Date();
      order.rejectionReason = "";

      // Reduce stock if BUY & tracking enabled
      if (order.orderType === "BUY") {
        const book = await Book.findById(order.book);
        if (book?.trackStock) {
          book.stockQuantity = Math.max(0, (book.stockQuantity || 0) - order.quantity);
          await book.save();
        }
      }

      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "APPROVED",
        oldValue: { status: prevStatus },
        newValue: { status: order.status, verifiedAt: order.verifiedAt },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Payment verified and approved`
      });

      // Notify user
      await Notification.create({
        user: order.user,
        type: "book_order_approved",
        title: "Book Order Approved",
        message: `Your payment for order ${order.orderNumber} has been verified and approved.`,
        link: "/student/my-book-orders"
      }).catch(() => null);

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/book-orders/:id/reject", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const { reason } = req.body;
      if (!reason?.trim()) {
        return res.status(400).json({ success: false, message: "A reason is required to reject an order." });
      }

      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (!canTransitionStatus(order.status, "REJECTED")) {
        return res.status(400).json({ success: false, message: `Cannot reject order from status: ${order.status}` });
      }

      const prevStatus = order.status;
      order.status = "REJECTED";
      order.rejectionReason = reason.trim();
      order.verifiedBy = req.user._id;
      order.verifiedAt = new Date();
      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "REJECTED",
        oldValue: { status: prevStatus },
        newValue: { status: order.status, rejectionReason: order.rejectionReason },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Rejected with reason: ${reason}`
      });

      // Notify user
      await Notification.create({
        user: order.user,
        type: "book_order_rejected",
        title: "Book Order Payment Not Verified",
        message: `Payment proof for order ${order.orderNumber} could not be verified: ${reason}. Please upload a clear receipt.`,
        link: "/student/my-book-orders"
      }).catch(() => null);

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/book-orders/:id/complete", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const { trackingInfo } = req.body;
      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (!canTransitionStatus(order.status, "COMPLETED")) {
        return res.status(400).json({ success: false, message: `Cannot mark completed from status: ${order.status}` });
      }

      const prevStatus = order.status;
      order.status = "COMPLETED";
      if (trackingInfo) order.trackingInfo = trackingInfo.trim();
      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "COMPLETED",
        oldValue: { status: prevStatus },
        newValue: { status: order.status, trackingInfo: order.trackingInfo },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Marked completed. ${trackingInfo ? `Tracking: ${trackingInfo}` : ""}`
      });

      // Notify user
      const msg = order.orderType === "BUY"
        ? `Your book order ${order.orderNumber} has been dispatched! ${trackingInfo ? `Courier Tracking: ${trackingInfo}` : ""}`
        : `Your sponsored distribution for order ${order.orderNumber} has been completed. Thank you for your devotional seva!`;

      await Notification.create({
        user: order.user,
        type: "book_order_completed",
        title: order.orderType === "BUY" ? "Book Order Dispatched" : "Book Distribution Seva Completed",
        message: msg,
        link: "/student/my-book-orders"
      }).catch(() => null);

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/book-orders/:id/note", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const { note } = req.body;
      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      order.adminNotes = note || "";
      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "NOTE_ADDED",
        newValue: { adminNotes: order.adminNotes },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Internal note updated`
      });

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post("/api/admin/book-orders/:id/cancel", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const { note = "" } = req.body;
      const order = await BookOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (order.status === "COMPLETED") {
        return res.status(400).json({ success: false, message: "Completed orders cannot be cancelled." });
      }

      const prevStatus = order.status;
      // If was approved, restore stock
      if (prevStatus === "APPROVED" && order.orderType === "BUY") {
        const book = await Book.findById(order.book);
        if (book?.trackStock) {
          book.stockQuantity = (book.stockQuantity || 0) + order.quantity;
          await book.save();
        }
      }

      order.status = "CANCELLED";
      if (note) order.adminNotes = `${order.adminNotes ? order.adminNotes + "\n" : ""}Cancelled by admin: ${note}`;
      await order.save();

      await logBookAudit({
        entityType: "ORDER",
        entityId: order._id,
        action: "STATUS_CHANGED",
        oldValue: { status: prevStatus },
        newValue: { status: "CANCELLED" },
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: `Admin cancelled order. Note: ${note}`
      });

      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // CSV Export
  app.get("/api/admin/book-orders/export", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const orders = await BookOrder.find()
        .populate("book", "title")
        .sort({ createdAt: -1 })
        .lean();

      const headers = [
        "Order Number",
        "Date",
        "Book",
        "Type",
        "Quantity",
        "Subtotal",
        "GST",
        "Shipping",
        "Total",
        "Status",
        "Contact Name",
        "Contact Phone",
        "Contact Email",
        "Transaction Ref",
        "Payer Name",
        "Dedication Name",
        "Delivery City",
        "Delivery Pincode"
      ];

      const rows = orders.map((o) => [
        sanitizeCsvCell(o.orderNumber),
        new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        sanitizeCsvCell(o.bookTitleSnapshot || o.book?.title || ""),
        o.orderType,
        o.quantity,
        o.subtotal,
        o.gstAmount,
        o.shippingFee,
        o.totalAmount,
        o.status,
        sanitizeCsvCell(o.contactName),
        sanitizeCsvCell(o.contactPhone),
        sanitizeCsvCell(o.contactEmail),
        sanitizeCsvCell(o.transactionReference || ""),
        sanitizeCsvCell(o.payerName || ""),
        sanitizeCsvCell(o.dedicationName || ""),
        sanitizeCsvCell(o.deliveryAddress?.city || ""),
        sanitizeCsvCell(o.deliveryAddress?.pincode || "")
      ]);

      const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="book-orders-${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // User book orders hook
  app.get("/api/admin/users/:id/book-orders", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      const orders = await BookOrder.find({ user: req.params.id })
        .populate("book", "title coverImage slug")
        .sort({ createdAt: -1 })
        .lean();

      let totalCopiesBuy = 0;
      let totalCopiesDistribute = 0;
      let totalAmountVerified = 0;

      orders.forEach((o) => {
        if (["APPROVED", "COMPLETED"].includes(o.status)) {
          if (o.orderType === "BUY") totalCopiesBuy += o.quantity;
          if (o.orderType === "DISTRIBUTE") totalCopiesDistribute += o.quantity;
          totalAmountVerified = round2(totalAmountVerified + o.totalAmount);
        }
      });

      res.json({
        success: true,
        orders,
        totals: {
          totalOrders: orders.length,
          totalCopiesBuy,
          totalCopiesDistribute,
          totalAmountVerified
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Payment settings CRUD
  app.get("/api/admin/book-payment-settings", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });
      const settings = await getEffectivePaymentSettings();
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put("/api/admin/book-payment-settings", ...adminOnlyMiddleware, async (req, res) => {
    try {
      if (!isBooksEnabled()) return res.status(404).json({ success: false, message: "Books module disabled" });

      let settings = await BookPaymentSetting.findOne({ singletonKey: "default_book_settings" });
      if (!settings) {
        settings = new BookPaymentSetting({ singletonKey: "default_book_settings" });
      }

      const oldSettings = settings.toObject();
      Object.assign(settings, req.body);
      await settings.save();

      await logBookAudit({
        entityType: "SETTINGS",
        entityId: "default_book_settings",
        action: "UPDATED",
        oldValue: oldSettings,
        newValue: settings.toObject(),
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: req.user.role,
        note: "Updated book payment settings"
      });

      res.json({ success: true, settings });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });
}
