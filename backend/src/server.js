import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import http from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { fileURLToPath } from "url";
import {
  AboutPageSection,
  Benefit,
  Blog,
  ChatMessage,
  ChatRoom,
  Comment,
  ContactMessage,
  Course,
  CourseEnrollmentRequest,
  Pilgrimage,
  BookingTax,
  PilgrimageBooking,
  TripAccess,
  ActivityLog,
  LoginSession,
  Enrollment,
  FileUpload,
  FooterSetting,
  HeroBanner,
  ImageGallery,
  LegalPage,
  Lesson,
  Note,
  Notification,
  OtpCode,
  Page,
  PageSection,
  PasswordResetRequest,
  Preacher,
  Progress,
  SiteSetting,
  Subscriber,
  Testimonial,
  TrafficLog,
  UpcomingClass,
  User,
  UserActivity,
  StudentAnalytics,
  VideoBlog,
  VideoGallery,
  TeacherAssignmentHistory,
  TeacherPerformance,
  CourseProgress,
  TeacherRating,
  TeacherAnalytics,
  ExamQuestionBank,
  ExamQuestion,
  ExamPaper,
  ExamAssignment,
  ExamAttempt,
  ExamResponse,
  CourseContent,
  ContentProgress,
  BookOrder,
  modelRegistry
} from "./models.js";
import { booksRouter, attachProtectedBookRoutes, attachAdminBookRoutes } from "./booksRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

/* In production the app sits behind nginx, so every request arrives from
   127.0.0.1 with the real client address in X-Forwarded-For. Trusting one
   proxy hop makes req.ip the visitor's address again, which is what the
   activity trail and login sessions record, and what the rate limiter
   counts against. Without it express-rate-limit also refuses to start,
   since it cannot tell visitors apart. One hop only: trusting the header
   blindly would let anyone spoof their own address. */
app.set("trust proxy", 1);

const port = process.env.PORT || 5055;

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Active socket connection registry: maps userId -> Set of socket.ids
const activeUsers = new Map();

// Helper to send real-time socket message to a specific user
const emitToUser = (userId, eventName, data) => {
  if (!userId) return;
  const socketIds = activeUsers.get(userId.toString());
  if (socketIds) {
    socketIds.forEach((sid) => {
      io.to(sid).emit(eventName, data);
    });
  }
};

io.on("connection", (socket) => {
  let currentUserId = null;

  socket.on("user_connected", async ({ userId }) => {
    if (!userId) return;
    currentUserId = userId.toString();
    
    // Register socket
    if (!activeUsers.has(currentUserId)) {
      activeUsers.set(currentUserId, new Set());
    }
    activeUsers.get(currentUserId).add(socket.id);

    // Update DB status to online
    try {
      await User.findByIdAndUpdate(currentUserId, { isOnline: true, lastActiveAt: new Date() });
      
      // Look up user details
      const user = await User.findById(currentUserId).select("name role profileImage");
      if (user) {
        // Broadcast online state
        io.emit(user.role === "main_admin" || user.role === "teacher" ? "admin_online" : "student_online", {
          userId: currentUserId,
          name: user.name,
          profileImage: user.profileImage,
          isOnline: true
        });
      }
    } catch (err) {
      console.error("Socket user_connected error:", err.message);
    }
  });

  socket.on("join_course_chat", ({ conversationId }) => {
    if (conversationId) {
      socket.join(conversationId.toString());
    }
  });

  socket.on("typing_start", ({ conversationId, userId, name }) => {
    if (conversationId) {
      socket.to(conversationId.toString()).emit("typing_start", { conversationId, userId, name });
    }
  });

  socket.on("typing_stop", ({ conversationId, userId }) => {
    if (conversationId) {
      socket.to(conversationId.toString()).emit("typing_stop", { conversationId, userId });
    }
  });

  socket.on("student_activity_update", async ({ userId, courseId, lessonId, currentVideoTime, isOnline }) => {
    if (!userId || !courseId || !lessonId) return;
    try {
      // 1. Update activity states
      await UserActivity.findOneAndUpdate(
        { user: userId, course: courseId },
        {
          user: userId,
          course: courseId,
          lesson: lessonId,
          currentVideoTime: currentVideoTime || 0,
          isOnline: isOnline !== undefined ? isOnline : true,
          lastActiveAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 2. Fetch full student details to broadcast to live admins
      const student = await User.findById(userId).select("name email profileImage");
      const course = await Course.findById(courseId).select("title");
      const lesson = await Lesson.findById(lessonId).select("title");

      // Calculate total daily watch time from analytics
      const todayStr = new Date().toISOString().split("T")[0];
      const analytics = await StudentAnalytics.findOne({ user: userId, course: courseId });
      const todayTimeRecord = analytics?.dailyWatchTimes?.find((r) => r.date === todayStr);
      const watchTimeToday = todayTimeRecord ? todayTimeRecord.minutes : 0;

      // Broadcast to admins/teachers
      io.emit("admin_activity_stream", {
        userId,
        name: student?.name || "Student",
        email: student?.email || "",
        profileImage: student?.profileImage || "",
        courseId,
        courseTitle: course?.title || "Unknown Course",
        lessonId,
        lessonTitle: lesson?.title || "Unknown Lesson",
        currentVideoTime,
        watchTimeToday,
        lastActiveAt: new Date(),
        isOnline: true
      });
    } catch (err) {
      console.error("student_activity_update error:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    if (!currentUserId) return;
    
    const socketIds = activeUsers.get(currentUserId);
    if (socketIds) {
      socketIds.delete(socket.id);
      if (socketIds.size === 0) {
        activeUsers.delete(currentUserId);

        // Update online status in DB
        try {
          await User.findByIdAndUpdate(currentUserId, { isOnline: false, lastSeen: new Date() });
          
          // Also set activity online flag to false
          await UserActivity.updateMany({ user: currentUserId }, { isOnline: false });

          const user = await User.findById(currentUserId).select("role");
          io.emit(user?.role === "main_admin" || user?.role === "teacher" ? "admin_offline" : "student_offline", {
            userId: currentUserId,
            isOnline: false,
            lastSeen: new Date()
          });
        } catch (err) {
          console.error("Socket disconnect error:", err.message);
        }
      }
    }
  });
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const learnerRoles = ["student", "devotee", "user", "teacher", "main_admin"];
const adminRoles = ["main_admin", "teacher"];
const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET || "development_secret";
const hashOtp = (otp) => crypto.createHmac("sha256", otpSecret).update(String(otp)).digest("hex");
const randomOtp = () => String(crypto.randomInt(100000, 1000000));
const strongPassword = (password = "") => password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

const sendEmail = async ({ to, subject, html, text }) => {
  const payload = { to, subject, html, text };
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") {
    console.log("[dev-email]", JSON.stringify(payload, null, 2));
    return { queued: false, dev: true };
  }
  console.log("[email-provider-not-configured]", JSON.stringify({ to, subject }, null, 2));
  return { queued: false, configured: false };
};

const createNotification = (payload) => Notification.create(payload).catch(() => null);

const issueOtp = async ({ user, email, purpose }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const otp = randomOtp();
  await OtpCode.updateMany({ email: normalizedEmail, purpose, consumedAt: null }, { consumedAt: new Date() });
  await OtpCode.create({
    user: user?._id,
    email: normalizedEmail,
    purpose,
    otpHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  const title = purpose === "register" ? "Verify your ISKCON Juhu Self-Excellence account" : "Reset your ISKCON Juhu Self-Excellence password";
  await sendEmail({
    to: normalizedEmail,
    subject: title,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
  });
  return otp;
};

const verifyOtpRecord = async ({ email, purpose, otp, consume = true }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const record = await OtpCode.findOne({ email: normalizedEmail, purpose, consumedAt: null }).sort({ createdAt: -1 });
  if (!record) throw Object.assign(new Error("OTP not found or already used"), { statusCode: 400 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error("OTP has expired"), { statusCode: 400 });
  if (record.attempts >= record.maxAttempts) throw Object.assign(new Error("Too many OTP attempts"), { statusCode: 429 });
  record.attempts += 1;
  if (record.otpHash !== hashOtp(otp)) {
    await record.save();
    throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });
  }
  record.verifiedAt = new Date();
  if (consume) record.consumedAt = new Date();
  await record.save();
  return record;
};

const isVerifiedForLogin = (user) => !learnerRoles.includes(user.role) || user.emailVerified !== false;
const canManageCourseArea = (user) => adminRoles.includes(user?.role);

const tokenFor = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "development_secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  mobile: user.mobile || user.phone,
  role: user.role,
  profileImage: user.profileImage,
  bio: user.bio,
  expertise: user.expertise,
  permissions: user.permissions,
  sectionAccess: user.sectionAccess,
  status: user.status,
  emailVerified: user.emailVerified,
  mustChangePassword: user.mustChangePassword,
  lastActiveAt: user.lastActiveAt,
  createdAt: user.createdAt
});

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) return res.status(401).json({ success: false, message: "Authentication token missing" });
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_secret");
  const user = await User.findById(decoded.id).select("-password");
  if (!user || user.status === "blocked" || user.status === "suspended") {
    return res.status(401).json({ success: false, message: "Your account has been blocked or suspended. Please contact admin support." });
  }
  if (user.status !== "active" && !["main_admin", "teacher"].includes(user.role)) return res.status(401).json({ success: false, message: "User is inactive or missing" });
  if (!isVerifiedForLogin(user)) return res.status(403).json({ success: false, message: "Please verify your email OTP before continuing" });
  req.user = user;
  next();
});

const optionalUser = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_secret");
    const user = await User.findById(decoded.id).select("-password");
    if (user && (user.status === "active" || ["main_admin", "teacher"].includes(user.role)) && isVerifiedForLogin(user)) req.user = user;
  } catch {
    req.user = null;
  }
  next();
});

const canSeeInactive = (req) => ["main_admin", "teacher"].includes(req.user?.role);

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "Forbidden" });
  next();
};

const authorizeLearner = (req, res, next) => {
  if (!req.user || !learnerRoles.includes(req.user.role)) return res.status(403).json({ success: false, message: "Student access required" });
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  if (req.user.role === "main_admin" || req.user.permissions?.[permission]) return next();
  return res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
};

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((item) => item.trim());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
      if (isLocal || !isLocal) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, standardHeaders: true, legacyHeaders: false }));

const uploadRoot = path.resolve(__dirname, "../uploads");
const cleanUploadFolder = (value = "general") =>
  value
    .toString()
    .split(/[\\/]+/)
    .map((part) => part.replace(/[^a-z0-9-_]/gi, "-").toLowerCase())
    .filter(Boolean)
    .join("/") || "general";
const uploadRules = (folder) => {
  if (folder === "banners" || folder === "courses") return { extensions: [".jpg", ".jpeg", ".png", ".webp"], mime: /^image\/(jpeg|png|webp)$/ };
  if (folder === "lessons/videos" || folder === "video-blogs/videos") return { extensions: [".mp4", ".webm", ".mov"], mime: /^(video\/mp4|video\/webm|video\/quicktime)$/ };
  if (folder === "video-blogs") return { extensions: [".jpg", ".jpeg", ".png", ".webp"], mime: /^image\/(jpeg|png|webp)$/ };
  if (folder === "lessons/pdfs") return { extensions: [".pdf"], mime: /^application\/pdf$/ };
  return { extensions: [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov", ".pdf"], mime: /^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime)|application\/pdf)$/ };
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = cleanUploadFolder(req.query.folder);
    const destination = path.join(uploadRoot, folder);
    import("fs").then((fs) => {
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    });
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const folder = cleanUploadFolder(req.query.folder);
    const ext = path.extname(file.originalname).toLowerCase();
    const rules = uploadRules(folder);
    if (!rules.extensions.includes(ext) || !rules.mime.test(file.mimetype)) return cb(new Error(`Invalid file type for ${folder}`));
    cb(null, true);
  }
});
app.use("/uploads", express.static(uploadRoot));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.originalUrl.startsWith("/api/admin") && !req.originalUrl.startsWith("/uploads")) {
    TrafficLog.create({
      pageUrl: req.headers["x-page-url"] || req.originalUrl,
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress,
      browser: req.headers["user-agent"],
      deviceType: /mobile|iphone|android/i.test(req.headers["user-agent"] || "") ? "mobile" : "desktop",
      referrer: req.headers.referer
    }).catch(() => {});
  }
  next();
});

const list = async (req, res, Model, filter = {}, options = {}) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 100);
  const query = Model.find(filter).sort(options.sort || { sortOrder: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  if (options.populate) query.populate(options.populate);
  const [items, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);
  res.json({
    success: true,
    items: options.decorate ? items.map(options.decorate) : items,
    total,
    page,
    pages: Math.ceil(total / limit) || 1
  });
};

/* ------------------------------------------------------------------
   Video posters
   ------------------------------------------------------------------
   An admin may upload a thumbnail, but is not required to: left blank,
   the still is taken from the video itself. Working that out here
   rather than in each component means the homepage band, the videos
   page and the admin list all show the same image.
   ------------------------------------------------------------------ */

const youtubeIdFrom = (url = "") => {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : "";
};
const vimeoIdFrom = (url = "") => {
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : "";
};

const decorateVideoBlog = (video) => {
  if (!video) return video;
  const youtubeId = youtubeIdFrom(video.videoUrl);
  const vimeoId = vimeoIdFrom(video.videoUrl);
  /* An uploaded file plays from our own server; anything else embeds. */
  const isUpload = video.videoType === "upload" && Boolean(video.uploadedVideo);
  return {
    ...video,
    youtubeId,
    vimeoId,
    isUpload,
    playbackUrl: isUpload ? video.uploadedVideo : video.videoUrl || "",
    /* Vimeo stills need an API call, so those fall back to the
       admin's own thumbnail or the component's placeholder. */
    posterUrl: video.thumbnail || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "")
  };
};

const mergeIntervals = (intervals) => {
  if (!intervals || !intervals.length) return [];
  const sorted = intervals
    .map((i) => ({ start: Number(i.start || 0), end: Number(i.end || 0) }))
    .sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
};

const getWatchedSeconds = (intervals) => {
  if (!intervals) return 0;
  return intervals.reduce((acc, curr) => acc + Math.max(curr.end - curr.start, 0), 0);
};

const progressSummary = async (studentId, courseId) => {
  const [totalLessons, completedLessons, lastProgress] = await Promise.all([
    Lesson.countDocuments({ course: courseId, status: "active" }),
    Progress.countDocuments({ student: studentId, course: courseId, isCompleted: true }),
    Progress.findOne({ student: studentId, course: courseId }).sort({ lastWatchedAt: -1 }).populate("lesson", "title slug").lean()
  ]);
  return {
    totalLessons,
    completedLessons,
    percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    lastLesson: lastProgress?.lesson || null
  };
};

const learnerEnrollment = async (userId, courseId) => Enrollment.findOne({ student: userId, course: courseId, status: { $in: ["active", "completed"] } }).lean();
const requireCourseMember = async (req, courseId) => {
  if (canManageCourseArea(req.user)) return true;
  if (!learnerRoles.includes(req.user?.role)) return false;
  return Boolean(await learnerEnrollment(req.user._id, courseId));
};

const findLessonWithCourse = async (lessonId) => {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) throw Object.assign(new Error("Lesson not found"), { statusCode: 404 });
  return lesson;
};

const getOrCreateChatRoom = async (course) =>
  ChatRoom.findOneAndUpdate(
    { course: course._id },
    { course: course._id, title: `${course.title} Chat` },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

app.get("/api/health", (req, res) => res.json({ success: true, message: "ISKCON LMS API is running" }));

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    let { name, email, phone, mobile, password, confirmPassword, role = "student" } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "Name and email are required" });
    const safeRole = learnerRoles.includes(role) ? role : "student";
    const isStaffRole = ["main_admin", "admin", "manager", "editor", "viewer", "teacher"].includes(safeRole);

    if (isStaffRole || password) {
      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required" });
      }
      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
      }
      if (!strongPassword(password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters and numbers" });
      }
    } else {
      password = `Devotee@${Math.floor(100000 + Math.random() * 900000)}`;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail }).select("+password");
    if (existing?.emailVerified && existing.status !== "pending" && existing.status !== "inactive") return res.status(409).json({ success: false, message: "Email is already registered" });
    const user = existing || new User({ email: normalizedEmail });
    Object.assign(user, {
      name,
      phone: phone || mobile,
      mobile: mobile || phone,
      password,
      role: safeRole,
      status: "active",
      emailVerified: true
    });
    await user.save();
    await createNotification({ audience: "admin", type: "user_registered", title: "New user registered", message: `${user.name} registered and account is active.`, link: "/admin/users" });
    res.status(201).json({
      success: true,
      requiresVerification: false,
      token: tokenFor(user),
      user: userPayload(user),
      message: "Registration successful"
    });
  })
);

app.post(
  "/api/auth/verify-otp",
  asyncHandler(async (req, res) => {
    const { email, otp, purpose = "register" } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });
    await verifyOtpRecord({ email, purpose, otp, consume: true });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.status = "active";
    user.emailVerified = true;
    user.otpVerifiedAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();
    res.json({ success: true, token: tokenFor(user), user: userPayload(user), message: "Email verified successfully" });
  })
);

app.post(
  "/api/auth/resend-otp",
  asyncHandler(async (req, res) => {
    const { email, purpose = "register" } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const devOtp = await issueOtp({ user, email: user.email, purpose });
    res.json({ success: true, message: "OTP sent successfully", devOtp: process.env.NODE_ENV === "production" ? undefined : devOtp });
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        notFound: true,
        message: "Email is not registered. Please create an account."
      });
    }

    const isAdminOrTeacher = ["main_admin", "admin", "manager", "editor", "viewer", "teacher"].includes(user.role);

    if (isAdminOrTeacher) {
      if (!req.body.password) {
        return res.status(400).json({
          success: false,
          message: "Password is required for admin and teacher login. Please use the Admin Login."
        });
      }
      const match = await user.matchPassword(req.body.password);
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
    } else {
      // For student / devotee / user accounts:
      // Allow passwordless email login. If a password is provided and stored, verify it.
      if (req.body.password && user.password) {
        const match = await user.matchPassword(req.body.password);
        if (!match) {
          return res.status(401).json({ success: false, message: "Invalid password" });
        }
      }
    }

    if (user.status === "blocked") return res.status(403).json({ success: false, message: "Account is blocked. Please contact admin." });

    if (user.status !== "active" && !isAdminOrTeacher) {
      user.status = "active";
      user.emailVerified = true;
    }
    user.lastActiveAt = new Date();
    await user.save();

    /* Record where this sign-in came from, so an admin can tie any
       later change back to a device and IP. */
    const client = describeClient(req);
    const session = await LoginSession.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      ...client
    }).catch(() => null);

    if (isStaff(user)) {
      await recordActivity({ ...req, user }, {
        action: "login",
        section: "sessions",
        resource: "login-sessions",
        resourceId: session ? String(session._id) : undefined,
        label: `${user.name} signed in`
      });
    }

    res.json({ success: true, token: tokenFor(user), user: userPayload(user) });
  })
);

app.post(
  "/api/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If this email exists, an OTP has been sent." });
    if (user.status === "blocked") return res.status(403).json({ success: false, message: "This account is blocked. Please request admin help." });
    const devOtp = await issueOtp({ user, email, purpose: "forgot_password" });
    res.json({ success: true, message: "Password reset OTP sent.", devOtp: process.env.NODE_ENV === "production" ? undefined : devOtp });
  })
);

app.post(
  "/api/auth/verify-forgot-otp",
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });
    await verifyOtpRecord({ email, purpose: "forgot_password", otp, consume: false });
    res.json({ success: true, message: "OTP verified. You can now reset your password." });
  })
);

app.post(
  "/api/auth/reset-password",
  asyncHandler(async (req, res) => {
    const { email, otp, password, confirmPassword } = req.body;
    if (!email || !otp || !password) return res.status(400).json({ success: false, message: "Email, OTP and new password are required" });
    if (confirmPassword && password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });
    if (!strongPassword(password)) return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters and numbers" });
    await verifyOtpRecord({ email, purpose: "forgot_password", otp, consume: true });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.password = password;
    user.mustChangePassword = false;
    await user.save();
    await createNotification({ user: user._id, type: "password_updated", title: "Password updated", message: "Your password was updated successfully." });
    await sendEmail({ to: user.email, subject: "Password updated", text: "Your ISKCON Juhu Self-Excellence password was updated successfully." });
    res.json({ success: true, message: "Password updated successfully" });
  })
);

app.post(
  "/api/auth/password-reset-request",
  asyncHandler(async (req, res) => {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email });
    const request = await PasswordResetRequest.create({ user: user?._id, email, message: req.body.message || req.body.reason || "" });
    await createNotification({ audience: "admin", type: "password_reset_request", title: "Password reset request", message: `${email} requested admin password help.`, link: "/admin/password-reset-requests" });
    res.status(201).json({ success: true, request, message: "Password reset request sent to admin." });
  })
);

app.put(
  "/api/auth/change-password",
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Current and new password are required" });
    if (confirmPassword && newPassword !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });
    if (!strongPassword(newPassword)) return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters and numbers" });
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) return res.status(401).json({ success: false, message: "Current password is incorrect" });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  })
);

app.get("/api/auth/me", protect, (req, res) => res.json({ success: true, user: userPayload(req.user) }));
/* ============================================================
   Google sign-in
   ------------------------------------------------------------
   The browser gets an ID token from Google and posts it here. We
   verify that token against our own client id — never trust the
   email the browser claims — then sign in the matching account,
   creating one on first visit.

   Password sign-in is untouched: staff and anyone with a password
   keep using /api/auth/login exactly as before.
   ============================================================ */

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

/* Lets the sign-in page know whether to draw the Google button. */
app.get("/api/auth/google-config", (req, res) =>
  res.json({ success: true, enabled: Boolean(googleClient), clientId: googleClientId })
);

app.post(
  "/api/auth/google",
  asyncHandler(async (req, res) => {
    if (!googleClient) {
      return res.status(503).json({
        success: false,
        message: "Google sign-in is not configured on this server."
      });
    }

    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: "Missing Google credential" });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: "Could not verify that Google sign-in. Please try again." });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ success: false, message: "That Google account has no verified email address." });
    }

    const email = payload.email.toLowerCase().trim();

    /* Match on the Google subject first, then fall back to the email so
       an existing password account is linked rather than duplicated. */
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
    const isNew = !user;

    if (!user) {
      user = new User({
        name: payload.name || email.split("@")[0],
        email,
        role: "student",
        status: "active",
        emailVerified: true
      });
    }

    user.googleId = payload.sub;
    user.emailVerified = true;
    if (!user.profileImage && payload.picture) user.profileImage = payload.picture;
    if (user.status === "pending" || user.status === "inactive") user.status = "active";
    user.lastActiveAt = new Date();

    if (user.status === "blocked") {
      return res.status(403).json({ success: false, message: "Account is blocked. Please contact admin." });
    }

    await user.save();

    if (isNew) {
      await createNotification({
        audience: "admin",
        type: "user_registered",
        title: "New user registered",
        message: `${user.name} signed up with Google.`,
        link: "/admin/users"
      });
    }

    /* Same session and audit trail as a password sign-in. */
    const client = describeClient(req);
    const session = await LoginSession.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      ...client
    }).catch(() => null);

    if (isStaff(user)) {
      await recordActivity({ ...req, user }, {
        action: "login",
        section: "sessions",
        resource: "login-sessions",
        resourceId: session ? String(session._id) : undefined,
        label: `${user.name} signed in with Google`
      });
    }

    res.json({ success: true, isNew, token: tokenFor(user), user: userPayload(user) });
  })
);

app.post("/api/auth/logout", (req, res) => res.json({ success: true, message: "Logged out" }));
app.put(
  "/api/auth/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    
    if (req.body.email && req.body.email !== user.email) {
      const existing = await User.findOne({ email: req.body.email });
      if (existing) return res.status(400).json({ success: false, message: "Email already in use" });
      user.email = req.body.email;
    }

    ["name", "phone", "profileImage", "bio", "expertise"].forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
    if (req.body.mobile !== undefined) {
      user.mobile = req.body.mobile;
      user.phone = req.body.mobile;
    }
    await user.save();
    res.json({ success: true, user: userPayload(user) });
  })
);

app.post(
  "/api/upload",
  protect,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const file = { url: `/uploads/${req.file.path.split("/uploads/")[1]}`, filename: req.file.filename };
    await FileUpload.create({ user: req.user._id, ...file, folder: cleanUploadFolder(req.query.folder), mimeType: req.file.mimetype, size: req.file.size }).catch(() => null);
    res.status(201).json({ success: true, file });
  })
);

app.get("/api/site-settings", asyncHandler(async (req, res) => res.json({ success: true, settings: await SiteSetting.findOne({ singletonKey: "site" }).lean() })));
app.get("/api/footer", asyncHandler(async (req, res) => res.json({ success: true, footer: await FooterSetting.findOne({ singletonKey: "footer" }).lean() })));
app.get(
  "/api/page-sections/:pageName",
  asyncHandler(async (req, res) => {
    const sections = await PageSection.find({ pageName: req.params.pageName.toLowerCase(), status: "active" }).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, sections });
  })
);
app.get("/api/about-sections", asyncHandler((req, res) => list(req, res, AboutPageSection, { status: "active" })));
app.get("/api/upcoming-classes", asyncHandler((req, res) => {
  const filter = { status: "active" };
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  /* Past sessions stay in the admin list but drop off the public one. */
  if (req.query.upcoming === "true") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    filter.$or = [{ date: { $gte: startOfToday } }, { date: null }];
  }
  return list(req, res, UpcomingClass, filter, { sort: { date: 1, sortOrder: 1 } });
}));

app.get("/api/upcoming-classes/:slug", asyncHandler(async (req, res) => {
  const item = await UpcomingClass.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!item) return res.status(404).json({ success: false, message: "Class not found" });
  res.json({ success: true, item });
}));
app.get("/api/benefits", asyncHandler((req, res) => list(req, res, Benefit, { status: "active" })));

/* ================= Pilgrimage booking ================= */

/* Works out what a booking costs. Always run server-side at submit
   time: the browser shows the same numbers, but these are the ones
   that get stored. */
const computeBookingTotal = (pricePerPerson, travellerCount, taxes) => {
  const subtotal = Math.round(pricePerPerson * travellerCount);
  const taxBreakdown = taxes.map((tax) => {
    const amount =
      tax.type === "percent"
        ? Math.round((subtotal * (tax.value || 0)) / 100)
        : Math.round((tax.value || 0) * (tax.appliesTo === "person" ? travellerCount : 1));
    return { label: tax.label, type: tax.type, value: tax.value, appliesTo: tax.appliesTo, amount };
  });
  const taxTotal = taxBreakdown.reduce((sum, t) => sum + t.amount, 0);
  return { subtotal, taxBreakdown, taxTotal, totalAmount: subtotal + taxTotal };
};

const activeTaxes = () => BookingTax.find({ status: "active" }).sort({ sortOrder: 1, createdAt: 1 }).lean();

/* A trip is bookable to the public only when published and active. */
const publishedTripFilter = () => ({ tripStatus: "published", status: { $ne: "inactive" } });

/* Seats are derived, never stored: capacity minus the travellers on
   approved bookings. Rejected and cancelled bookings free their seats. */
const seatsTakenFor = async (tripIds) => {
  const rows = await PilgrimageBooking.aggregate([
    { $match: { pilgrimage: { $in: tripIds.map((id) => new mongoose.Types.ObjectId(String(id))) }, status: "approved" } },
    { $group: { _id: "$pilgrimage", taken: { $sum: "$travellerCount" } } }
  ]);
  return rows.reduce((map, r) => ({ ...map, [String(r._id)]: r.taken }), {});
};

/* Adds availability + booking-window state to a trip document. */
const decorateTrip = (trip, taken = 0) => {
  const capacity = trip.maxTravellers || 0;
  const seatsLeft = Math.max(capacity - taken, 0);
  const now = new Date();
  const notOpenYet = trip.bookingOpenDate && now < new Date(trip.bookingOpenDate);
  const closed = trip.bookingCloseDate && now > new Date(trip.bookingCloseDate);
  const departed = trip.startDate && now > new Date(trip.startDate);
  let bookingState = "open";
  if (!trip.bookingEnabled) bookingState = "disabled";
  else if (notOpenYet) bookingState = "not_open";
  else if (closed) bookingState = "closed";
  else if (departed) bookingState = "departed";
  else if (seatsLeft <= 0) bookingState = "full";
  return { ...trip, seatsTaken: taken, seatsLeft, isFull: seatsLeft <= 0, bookingState, canBook: bookingState === "open" };
};

/* Public trip list. Supports the filters and sorts the /trips page
   offers; everything is applied in the query, never in the browser. */
app.get("/api/trips", asyncHandler(async (req, res) => {
  const filter = publishedTripFilter();
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  if (req.query.featured === "true") filter.featured = true;
  if (req.query.destination) filter.destination = new RegExp(req.query.destination, "i");
  if (req.query.tripType) filter.tripType = req.query.tripType;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [{ title: regex }, { destination: regex }, { shortDescription: regex }, { tripType: regex }];
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.pricePerPerson = {};
    if (req.query.minPrice) filter.pricePerPerson.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.pricePerPerson.$lte = Number(req.query.maxPrice);
  }
  if (req.query.from) filter.startDate = { ...(filter.startDate || {}), $gte: new Date(req.query.from) };
  if (req.query.to) filter.startDate = { ...(filter.startDate || {}), $lte: new Date(req.query.to) };
  if (req.query.upcoming === "true") filter.startDate = { ...(filter.startDate || {}), $gte: new Date() };

  const sorts = {
    upcoming: { startDate: 1 },
    price_asc: { pricePerPerson: 1 },
    price_desc: { pricePerPerson: -1 },
    popular: { featured: -1, featuredOrder: 1, createdAt: -1 },
    newest: { createdAt: -1 }
  };
  const sort = sorts[req.query.sort] || { featuredOrder: 1, sortOrder: 1, startDate: 1 };

  const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);

  const [items, total] = await Promise.all([
    Pilgrimage.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Pilgrimage.countDocuments(filter)
  ]);
  const taken = await seatsTakenFor(items.map((t) => t._id));
  const decorated = items.map((t) => decorateTrip(t, taken[String(t._id)] || 0));
  const available = req.query.availability === "available" ? decorated.filter((t) => !t.isFull) : decorated;

  res.json({ success: true, items: available, total, page, pages: Math.ceil(total / limit) || 1 });
}));

/* Distinct values for the filter dropdowns, so the UI never invents options. */
app.get("/api/trips/filters", asyncHandler(async (req, res) => {
  const filter = publishedTripFilter();
  const [destinations, tripTypes, priceRange] = await Promise.all([
    Pilgrimage.distinct("destination", filter),
    Pilgrimage.distinct("tripType", filter),
    Pilgrimage.aggregate([
      { $match: filter },
      { $group: { _id: null, min: { $min: "$pricePerPerson" }, max: { $max: "$pricePerPerson" } } }
    ])
  ]);
  res.json({
    success: true,
    destinations: destinations.filter(Boolean).sort(),
    tripTypes: tripTypes.filter(Boolean).sort(),
    priceRange: priceRange[0] ? { min: priceRange[0].min, max: priceRange[0].max } : { min: 0, max: 0 }
  });
}));

app.get("/api/trips/:slug", asyncHandler(async (req, res) => {
  const trip = await Pilgrimage.findOne({ slug: req.params.slug, ...publishedTripFilter() }).lean();
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
  const taken = await seatsTakenFor([trip._id]);
  const decorated = decorateTrip(trip, taken[String(trip._id)] || 0);
  /* The guide PDF is fetched through its own gated route, so the raw
     path never reaches an unauthenticated page. */
  const { pdfUrl, ...safe } = decorated;
  res.json({ success: true, item: { ...safe, hasPdf: Boolean(pdfUrl) } });
}));

/* Trip guide download. Only someone with an approved booking (or an
   admin) gets the file; everybody else gets a clear 403. */
app.get("/api/trips/:slug/guide", protect, asyncHandler(async (req, res) => {
  const trip = await Pilgrimage.findOne({ slug: req.params.slug }).lean();
  if (!trip || !trip.pdfUrl) return res.status(404).json({ success: false, message: "No trip guide available" });
  if (req.user.role !== "main_admin") {
    const access = await TripAccess.findOne({ user: req.user._id, pilgrimage: trip._id, status: "active" });
    if (!access) {
      return res.status(403).json({ success: false, message: "The trip guide unlocks once your booking is confirmed." });
    }
  }
  res.json({ success: true, url: trip.pdfUrl, name: trip.pdfName || "trip-guide.pdf" });
}));

/* Kept so anything still calling the old path keeps working. */
app.get("/api/pilgrimages", asyncHandler(async (req, res) => {
  const filter = { status: "active" };
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  if (req.query.featured === "true") filter.featured = true;
  const items = await Pilgrimage.find(filter).sort({ sortOrder: 1, createdAt: -1 }).limit(24).lean();
  const taken = await seatsTakenFor(items.map((t) => t._id));
  res.json({ success: true, items: items.map((t) => decorateTrip(t, taken[String(t._id)] || 0)), total: items.length });
}));

app.get("/api/pilgrimages/:slug", asyncHandler(async (req, res) => {
  const item = await Pilgrimage.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!item) return res.status(404).json({ success: false, message: "Pilgrimage not found" });
  const taken = await seatsTakenFor([item._id]);
  res.json({ success: true, item: decorateTrip(item, taken[String(item._id)] || 0) });
}));

/* Public so the booking form can price a trip before submitting. */
app.get("/api/booking-taxes", asyncHandler(async (req, res) => {
  res.json({ success: true, items: await activeTaxes() });
}));

/* Live quote for the form. Keeps the browser and the server using
   one implementation instead of two that can drift apart. */
app.post("/api/pilgrimage-bookings/quote", asyncHandler(async (req, res) => {
  const { pilgrimageId, travellerCount } = req.body;
  const pilgrimage = await Pilgrimage.findById(pilgrimageId).lean();
  if (!pilgrimage) return res.status(404).json({ success: false, message: "Pilgrimage not found" });
  const count = Math.max(1, Math.min(Number(travellerCount) || 1, pilgrimage.maxTravellers || 10));
  const taxes = await activeTaxes();
  res.json({
    success: true,
    quote: { pricePerPerson: pilgrimage.pricePerPerson, travellerCount: count, ...computeBookingTotal(pilgrimage.pricePerPerson, count, taxes) }
  });
}));

app.post("/api/pilgrimage-bookings", protect, asyncHandler(async (req, res) => {
  const { pilgrimageId, fullName, email, phone, travellers, message, paymentPhotoUrl } = req.body;

  if (!pilgrimageId || !fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: "Full name, email and phone are required." });
  }

  const pilgrimage = await Pilgrimage.findById(pilgrimageId);
  if (!pilgrimage || pilgrimage.status === "inactive") {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  const people = Array.isArray(travellers) ? travellers.filter((t) => t && t.name && t.name.trim()) : [];
  if (!people.length) {
    return res.status(400).json({ success: false, message: "Add at least one traveller with a name." });
  }

  /* One source of truth for whether this trip can be booked at all. */
  const takenMap = await seatsTakenFor([pilgrimage._id]);
  const state = decorateTrip(pilgrimage.toObject(), takenMap[String(pilgrimage._id)] || 0);
  const stateMessage = {
    disabled: "Bookings for this journey are not open.",
    not_open: "Bookings for this journey have not opened yet.",
    closed: "Bookings for this journey have closed.",
    departed: "This journey has already departed.",
    full: "This journey is fully booked."
  };
  if (!state.canBook) {
    return res.status(400).json({ success: false, message: stateMessage[state.bookingState] || "Bookings are closed." });
  }
  if (people.length > state.seatsLeft) {
    return res.status(400).json({
      success: false,
      message: `Only ${state.seatsLeft} seat${state.seatsLeft === 1 ? "" : "s"} left on this journey.`
    });
  }

  if (pilgrimage.pricePerPerson > 0 && !paymentPhotoUrl) {
    return res.status(400).json({ success: false, message: "Please upload your payment receipt / screenshot." });
  }

  /* Duplicate protection: an approved booking blocks outright, a
     pending one tells them it is already being looked at. */
  const existing = await PilgrimageBooking.findOne({
    user: req.user._id,
    pilgrimage: pilgrimageId,
    status: { $in: ["pending", "payment_submitted", "approved"] }
  }).lean();
  if (existing) {
    return res.status(400).json({
      success: false,
      code: existing.status === "approved" ? "already_booked" : "booking_pending",
      message:
        existing.status === "approved"
          ? "You are already booked on this journey."
          : "Your booking for this journey is currently under verification."
    });
  }

  const taxes = await activeTaxes();
  const totals = computeBookingTotal(pilgrimage.pricePerPerson, people.length, taxes);

  const booking = await PilgrimageBooking.create({
    user: req.user._id,
    pilgrimage: pilgrimageId,
    bookingRef: `PJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    fullName,
    email,
    phone,
    travellers: people.map((t) => ({ name: t.name.trim(), age: Number(t.age) || undefined, gender: t.gender || "" })),
    travellerCount: people.length,
    message,
    pricePerPerson: pilgrimage.pricePerPerson,
    ...totals,
    paymentPhotoUrl,
    status: paymentPhotoUrl ? "payment_submitted" : "pending",
    paymentStatus: paymentPhotoUrl ? "proof_submitted" : "unpaid"
  });

  await createNotification({
    audience: "admin",
    type: "pilgrimage_booking",
    title: "New pilgrimage booking",
    message: `${fullName} booked ${people.length} place(s) on ${pilgrimage.title}.`,
    link: "/admin/pilgrimage-bookings"
  });

  await recordActivity(req, {
    action: "create",
    source: "public",
    section: "trip-bookings",
    resource: "pilgrimage-bookings",
    resourceId: String(booking._id),
    label: `${fullName} booked ${people.length} place(s) on ${pilgrimage.title}`,
    after: booking.toObject ? booking.toObject() : booking
  });

  res.status(201).json({ success: true, booking, message: "Your booking has been submitted. Our team will confirm it shortly." });
}));

/* Trips the devotee actually has access to — i.e. approved bookings.
   This is what powers "My Trips" in the dashboard. */
app.get("/api/my-trips", protect, asyncHandler(async (req, res) => {
  const access = await TripAccess.find({ user: req.user._id, status: "active" })
    .populate("pilgrimage")
    .populate("booking", "bookingRef travellerCount totalAmount status submittedAt travellers")
    .sort({ grantedAt: -1 })
    .lean();
  const items = access
    .filter((a) => a.pilgrimage)
    .map((a) => ({
      ...a,
      pilgrimage: { ...a.pilgrimage, pdfUrl: undefined, hasPdf: Boolean(a.pilgrimage.pdfUrl) }
    }));
  res.json({ success: true, items });
}));

/* The full trip area for one booked trip, including the guide link. */
app.get("/api/my-trips/:slug", protect, asyncHandler(async (req, res) => {
  const trip = await Pilgrimage.findOne({ slug: req.params.slug }).lean();
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
  const access = await TripAccess.findOne({ user: req.user._id, pilgrimage: trip._id, status: "active" })
    .populate("booking", "bookingRef travellerCount travellers subtotal taxBreakdown taxTotal totalAmount status submittedAt")
    .lean();
  if (!access) {
    return res.status(403).json({ success: false, message: "This trip unlocks once your booking is confirmed." });
  }
  const taken = await seatsTakenFor([trip._id]);
  res.json({ success: true, item: decorateTrip(trip, taken[String(trip._id)] || 0), booking: access.booking, access });
}));

app.get("/api/pilgrimage-bookings/my-bookings", protect, asyncHandler(async (req, res) => {
  const items = await PilgrimageBooking.find({ user: req.user._id })
    .populate("pilgrimage", "title slug image")
    .sort({ submittedAt: -1 })
    .lean();
  res.json({ success: true, items });
}));

app.get("/api/admin/trip-stats", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalTrips, publishedTrips, upcomingTrips, bookingCounts, revenueRows, participantRows] = await Promise.all([
    Pilgrimage.countDocuments({}),
    Pilgrimage.countDocuments({ tripStatus: "published" }),
    Pilgrimage.countDocuments({ tripStatus: "published", startDate: { $gte: now } }),
    PilgrimageBooking.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    PilgrimageBooking.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }
    ]),
    PilgrimageBooking.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, participants: { $sum: "$travellerCount" } } }
    ])
  ]);
  const byStatus = bookingCounts.reduce((m, r) => ({ ...m, [r._id]: r.n }), {});
  res.json({
    success: true,
    stats: {
      totalTrips,
      publishedTrips,
      upcomingTrips,
      totalBookings: bookingCounts.reduce((n, r) => n + r.n, 0),
      pendingBookings: (byStatus.pending || 0) + (byStatus.payment_submitted || 0),
      approvedBookings: byStatus.approved || 0,
      rejectedBookings: byStatus.rejected || 0,
      revenue: revenueRows[0]?.revenue || 0,
      upcomingParticipants: participantRows[0]?.participants || 0
    }
  });
}));

/* Admin trip list with the derived seat counts the table needs. */
app.get("/api/admin/trips-overview", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const trips = await Pilgrimage.find({}).sort({ featuredOrder: 1, createdAt: -1 }).lean();
  const taken = await seatsTakenFor(trips.map((t) => t._id));
  res.json({ success: true, items: trips.map((t) => decorateTrip(t, taken[String(t._id)] || 0)) });
}));

app.put("/api/admin/pilgrimage-bookings/:id/approve", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const booking = await PilgrimageBooking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  if (booking.status === "approved") {
    return res.status(400).json({ success: false, message: "This booking is already confirmed." });
  }

  /* Re-check capacity at approval time — other bookings may have been
     approved since this one was submitted. */
  const takenMap = await seatsTakenFor([booking.pilgrimage]);
  const trip = await Pilgrimage.findById(booking.pilgrimage);
  const seatsLeft = Math.max((trip?.maxTravellers || 0) - (takenMap[String(booking.pilgrimage)] || 0), 0);
  if (booking.travellerCount > seatsLeft) {
    return res.status(400).json({
      success: false,
      message: `Only ${seatsLeft} seat(s) remain, but this booking is for ${booking.travellerCount}. Reject it or raise the trip capacity first.`
    });
  }

  booking.status = "approved";
  booking.paymentStatus = "verified";
  booking.reviewedBy = req.user._id;
  booking.reviewedAt = new Date();
  await booking.save();

  /* Access is granted here and nowhere else. */
  await TripAccess.findOneAndUpdate(
    { user: booking.user, pilgrimage: booking.pilgrimage },
    { user: booking.user, pilgrimage: booking.pilgrimage, booking: booking._id, status: "active", grantedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const pilgrimage = await Pilgrimage.findById(booking.pilgrimage).lean();
  await createNotification({
    user: booking.user,
    type: "booking_approved",
    title: "Pilgrimage booking confirmed",
    message: `Your booking ${booking.bookingRef} for ${pilgrimage?.title || "the journey"} is confirmed.`,
    link: "/student/dashboard"
  });

  res.json({ success: true, message: "Booking confirmed.", booking });
}));

app.put("/api/admin/pilgrimage-bookings/:id/reject", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "Rejection reason is required." });
  }
  const booking = await PilgrimageBooking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  booking.status = "rejected";
  booking.paymentStatus = "failed";
  booking.rejectionReason = reason;
  booking.reviewedBy = req.user._id;
  booking.reviewedAt = new Date();
  await booking.save();

  /* If this booking had previously been approved, take the access back. */
  await TripAccess.findOneAndUpdate(
    { user: booking.user, pilgrimage: booking.pilgrimage, booking: booking._id },
    { status: "revoked" }
  );

  const pilgrimage = await Pilgrimage.findById(booking.pilgrimage).lean();
  await createNotification({
    user: booking.user,
    type: "booking_rejected",
    title: "Pilgrimage booking declined",
    message: `Your booking ${booking.bookingRef} for ${pilgrimage?.title || "the journey"} was declined. Reason: ${reason}`,
    link: "/student/dashboard"
  });

  res.json({ success: true, message: "Booking rejected.", booking });
}));
app.get("/api/testimonials", asyncHandler((req, res) => list(req, res, Testimonial, { status: "active" })));

const activeCourseFilter = () => ({ isActive: { $ne: false }, status: { $ne: "draft" } });
const activeLessonFilter = () => ({ isActive: { $ne: false }, status: { $ne: "inactive" }, publishStatus: { $ne: "draft" } });
const idOrSlug = (value) => (mongoose.isValidObjectId(value) ? { _id: value } : { slug: value });
const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1" || value === "yes" || value === "on";
};
const cleanNumber = (value, fallback = 0) => (value === "" || value === undefined || value === null ? fallback : Number(value));
const prepareBannerBody = (body) => {
  const data = { ...body };
  if (data.order !== undefined) data.order = cleanNumber(data.order);
  if (data.isActive !== undefined) data.isActive = toBoolean(data.isActive);
  return data;
};
const prepareCourseBody = (body, userId, create = false) => {
  const data = { ...body };
  if (!data.slug && data.title) data.slug = slugify(data.title);
  if (data.isFree !== undefined) {
    data.isFree = toBoolean(data.isFree);
    data.priceType = data.isFree ? "Free" : "Paid";
  } else if (data.priceType) {
    data.isFree = data.priceType === "Free";
  }
  if (data.price !== undefined) data.price = cleanNumber(data.price);
  if (data.order !== undefined) data.order = cleanNumber(data.order);
  if (data.isActive !== undefined) {
    data.isActive = toBoolean(data.isActive);
    data.status = data.isActive ? "published" : "draft";
  } else if (create) {
    data.isActive = true;
    data.status = data.status || "published";
  }
  if (!data.shortDescription && data.description) data.shortDescription = data.description.replace(/<[^>]*>/g, "").slice(0, 180);
  if (!data.createdBy) data.createdBy = userId;
  return data;
};
const prepareLessonBody = (body, courseId, userId, create = false) => {
  const allowed = ["title", "description", "videoType", "youtubeUrl", "videoUrl", "uploadedVideo", "thumbnail", "pdfFile", "attachmentFile", "duration", "order", "isActive", "sortOrder", "commentsEnabled", "notesEnabled", "chatEnabled", "completionThreshold", "videoSettings", "quizSettings", "examPaper"];
  const data = {};
  allowed.forEach(key => { if(body[key] !== undefined) data[key] = body[key]; });
  if (data.examPaper === "") data.examPaper = null;
  const lessonCourse = courseId || body.course || body.courseId;
  if (lessonCourse) data.course = lessonCourse;
  if (!data.slug && body.title) data.slug = slugify(body.title);
  if (data.videoType === "uploaded") data.videoType = "upload";
  if (data.youtubeUrl && !data.videoUrl) data.videoUrl = data.youtubeUrl;
  if (data.videoUrl && !data.youtubeUrl && data.videoType !== "upload") data.youtubeUrl = data.videoUrl;
  if (data.order !== undefined) {
    data.order = cleanNumber(data.order);
    data.sortOrder = data.order;
  } else if (data.sortOrder !== undefined) {
    data.sortOrder = cleanNumber(data.sortOrder);
    data.order = data.sortOrder;
  }
  if (data.isActive !== undefined) {
    data.isActive = toBoolean(data.isActive);
    data.status = data.isActive ? "active" : "inactive";
  } else if (create) {
    data.isActive = true;
    data.status = data.status || "active";
  }
  ["commentsEnabled", "notesEnabled", "chatEnabled"].forEach((field) => {
    if (data[field] !== undefined) data[field] = toBoolean(data[field]);
  });
  if (data.completionThreshold !== undefined) data.completionThreshold = Math.min(Math.max(cleanNumber(data.completionThreshold, 80), 1), 100);
  if (data.publishStatus === undefined && create) data.publishStatus = "published";
  if (!data.createdBy) data.createdBy = userId;
  return data;
};
const courseList = async (req, res, forceActive = false) => {
  const filter = forceActive || !canSeeInactive(req) ? activeCourseFilter() : {};
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  if (req.query.featured === "true") filter.featured = true;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [{ title: regex }, { shortDescription: regex }, { description: regex }, { category: regex }];
  }
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 100);
  const projection = forceActive || !canSeeInactive(req) ? "title slug thumbnail bannerImage shortDescription category level duration price priceType isFree isActive order featured showOnHomepage teacher createdAt updatedAt" : undefined;
  const [courses, total] = await Promise.all([
    Course.find(filter).select(projection).populate("teacher", "name profileImage bio expertise").sort({ order: 1, featured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Course.countDocuments(filter)
  ]);
  const counts = await Lesson.aggregate([{ $match: { course: { $in: courses.map((course) => course._id) }, ...activeLessonFilter() } }, { $group: { _id: "$course", totalLessons: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.totalLessons]));
  res.json({ success: true, items: courses.map((course) => ({ ...course, totalLessons: countMap.get(course._id.toString()) || 0 })), total, page, pages: Math.ceil(total / limit) || 1 });
};
const findCourseForRequest = async (req, value) => {
  const filter = { ...idOrSlug(value), ...(canSeeInactive(req) ? {} : activeCourseFilter()) };
  return Course.findOne(filter).populate("teacher", "name profileImage bio expertise").lean();
};
const lessonListForCourse = async (req, courseId) => {
  const course = await Course.findOne(idOrSlug(courseId)).select("_id").lean();
  if (!course) return null;
  const filter = { course: course._id, ...(canSeeInactive(req) ? {} : activeLessonFilter()) };
  const lessons = await Lesson.find(filter).populate("examPaper", "title").sort({ order: 1, sortOrder: 1, createdAt: 1 }).lean();
  
  const contentsFilter = { course: course._id };
  if (!canSeeInactive(req)) contentsFilter.isActive = true;
  const contents = await CourseContent.find(contentsFilter).sort({ order: 1, createdAt: 1 }).lean();
  
  lessons.forEach(lesson => {
    lesson.contents = contents.filter(c => c.lesson.toString() === lesson._id.toString());
  });
  
  return lessons;
};

app.get("/api/banners/active", asyncHandler(async (req, res) => res.json({ success: true, items: await HeroBanner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean() })));
app.get("/api/banners", protect, authorize("main_admin"), asyncHandler(async (req, res) => list(req, res, HeroBanner, {}, { sort: { order: 1, createdAt: -1 } })));
app.post("/api/banners", protect, authorize("main_admin"), asyncHandler(async (req, res) => res.status(201).json({ success: true, item: await HeroBanner.create(prepareBannerBody(req.body)) })));
app.put("/api/banners/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => res.json({ success: true, item: await HeroBanner.findByIdAndUpdate(req.params.id, prepareBannerBody(req.body), { new: true, runValidators: true }) })));
app.delete("/api/banners/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  await HeroBanner.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Banner deleted" });
}));

app.get("/api/courses/active", optionalUser, asyncHandler((req, res) => courseList(req, res, true)));
app.get("/api/courses", optionalUser, asyncHandler((req, res) => courseList(req, res, false)));
app.post("/api/courses", protect, authorize("main_admin"), asyncHandler(async (req, res) => res.status(201).json({ success: true, item: await Course.create(prepareCourseBody(req.body, req.user._id, true)) })));
app.put("/api/courses/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => res.json({ success: true, item: await Course.findByIdAndUpdate(req.params.id, prepareCourseBody(req.body, req.user._id), { new: true, runValidators: true }) })));
app.delete("/api/courses/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  await Promise.all([Course.findByIdAndDelete(req.params.id), Lesson.deleteMany({ course: req.params.id }), Enrollment.deleteMany({ course: req.params.id }), Progress.deleteMany({ course: req.params.id })]);
  res.json({ success: true, message: "Course deleted" });
}));

app.get("/api/courses/:courseId/lessons", optionalUser, asyncHandler(async (req, res) => {
  const lessons = await lessonListForCourse(req, req.params.courseId);
  if (!lessons) return res.status(404).json({ success: false, message: "Course not found" });
  res.json({ success: true, items: lessons, lessons });
}));
app.post("/api/courses/:courseId/lessons", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const course = await Course.findOne(idOrSlug(req.params.courseId)).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });
  const item = await Lesson.create(prepareLessonBody(req.body, course._id, req.user._id, true));
  res.status(201).json({ success: true, item });
}));
app.get("/api/courses/:id", optionalUser, asyncHandler(async (req, res) => {
  const course = await findCourseForRequest(req, req.params.id);
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });
  const [lessons, relatedCourses, enrolledStudentsCount] = await Promise.all([
    lessonListForCourse(req, course._id),
    Course.find({ _id: { $ne: course._id }, category: course.category, ...activeCourseFilter() }).sort({ order: 1 }).limit(3).lean(),
    Enrollment.countDocuments({ course: course._id })
  ]);
  res.json({ success: true, course: { ...course, lessons: lessons || [], relatedCourses, totalLessons: lessons?.length || 0, enrolledStudentsCount } });
}));
app.get("/api/lessons/:id", optionalUser, asyncHandler(async (req, res) => {
  const filter = { ...idOrSlug(req.params.id), ...(canSeeInactive(req) ? {} : activeLessonFilter()) };
  if (req.query.courseId) filter.course = req.query.courseId;
  const lesson = await Lesson.findOne(filter).populate("course", "title slug enrollmentType teacher").lean();
  if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });

  if (lesson.course && !lesson.isPreview) {
    const courseTypes = Array.isArray(lesson.course.enrollmentType)
      ? lesson.course.enrollmentType
      : [lesson.course.enrollmentType || "free"];
    const requiresVerificationOrPaid = courseTypes.some(t => ["verification", "paid"].includes(t));
    if (requiresVerificationOrPaid) {
      let hasAccess = false;
      if (req.user) {
        if (["main_admin"].includes(req.user.role)) {
          hasAccess = true;
        } else if (req.user.role === "teacher" && lesson.course.teacher?.toString() === req.user._id.toString()) {
          hasAccess = true;
        } else {
          const enrolled = await learnerEnrollment(req.user._id, lesson.course._id);
          if (enrolled) {
            const needsVerification = courseTypes.includes("verification");
            const needsPaid = courseTypes.includes("paid");
            if (needsVerification || needsPaid) {
              const request = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: lesson.course._id, status: "approved" });
              if (request) hasAccess = true;
            } else {
              hasAccess = true;
            }
          }
        }
      }
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You need admin verification before accessing this lesson.",
          requiresVerification: true,
          courseId: lesson.course._id,
          courseSlug: lesson.course.slug
        });
      }
    }
  }

  res.json({ success: true, lesson });
}));
app.put("/api/lessons/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => res.json({ success: true, item: await Lesson.findByIdAndUpdate(req.params.id, prepareLessonBody(req.body, null, req.user._id), { new: true, runValidators: true }) })));
app.delete("/api/lessons/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  await Promise.all([Lesson.findByIdAndDelete(req.params.id), Progress.deleteMany({ lesson: req.params.id })]);
  res.json({ success: true, message: "Lesson deleted" });
}));

app.get(
  "/api/courses/:id/enrollment-status",
  protect,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const types = Array.isArray(course.enrollmentType)
      ? course.enrollmentType
      : [course.enrollmentType || "free"];

    const enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id });
    if (enrollment) {
      if (types.includes("verification") || types.includes("paid")) {
        const request = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: course._id, status: "approved" });
        if (!request) {
          const pendingRequest = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: course._id }).sort({ submittedAt: -1 }).lean();
          return res.json({
            success: true,
            enrolled: false,
            request: pendingRequest || null,
            enrollmentType: types,
            verificationInstructions: course.verificationInstructions || "",
            requiredDocumentName: course.requiredDocumentName || "Letter of Recommendation",
            allowedFileTypes: course.allowedFileTypes || ["pdf", "jpg", "jpeg", "png"],
            maxFileSize: course.maxFileSize || 5
          });
        }
      }
      return res.json({ success: true, enrolled: true, status: enrollment.status, enrollmentType: types });
    }

    const request = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: course._id }).sort({ submittedAt: -1 }).lean();
    res.json({
      success: true,
      enrolled: false,
      request: request || null,
      enrollmentType: types,
      verificationInstructions: course.verificationInstructions || "",
      requiredDocumentName: course.requiredDocumentName || "Letter of Recommendation",
      allowedFileTypes: course.allowedFileTypes || ["pdf", "jpg", "jpeg", "png"],
      maxFileSize: course.maxFileSize || 5
    });
  })
);

app.post(
  "/api/courses/:courseId/enroll",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.isActive === false || course.status === "draft") return res.status(404).json({ success: false, message: "Course not found" });
    
    const types = Array.isArray(course.enrollmentType)
      ? course.enrollmentType
      : [course.enrollmentType || "free"];
    
    if (types.includes("paid") && !types.includes("free")) {
      return res.status(400).json({ success: false, message: "This course requires payment. Payment integration is coming soon." });
    }
    
    if (types.includes("verification") && !types.includes("free")) {
      const request = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: course._id, status: "approved" });
      if (!request) {
        return res.status(400).json({ success: false, message: "Enrollment requires admin verification approval." });
      }
    }
    
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: req.user._id, course: course._id },
      { student: req.user._id, course: course._id, status: "active", enrolledAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, enrollment, message: "Enrolled successfully" });
  })
);

app.post(
  "/api/course-requests",
  protect,
  asyncHandler(async (req, res) => {
    const { courseId, fullName, email, phone, message, documentUrl, documentType, paymentPhotoUrl } = req.body;
    if (!courseId || !fullName || !email || !phone) {
      return res.status(400).json({ success: false, message: "Full Name, Email and Phone are required." });
    }
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    
    const types = Array.isArray(course.enrollmentType)
      ? course.enrollmentType
      : [course.enrollmentType || "free"];
    const requiresDoc = types.includes("verification");
    const requiresPay = types.includes("paid");

    if (requiresDoc && !documentUrl) {
      return res.status(400).json({ success: false, message: "Document upload is required for this course." });
    }
    if (requiresPay && !paymentPhotoUrl) {
      return res.status(400).json({ success: false, message: "Payment photo receipt is required for this course." });
    }
    
    const existing = await CourseEnrollmentRequest.findOne({ student: req.user._id, course: courseId, status: "pending" });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending verification request for this course." });
    }
    
    const request = await CourseEnrollmentRequest.create({
      student: req.user._id,
      course: courseId,
      fullName,
      email,
      phone,
      message,
      documentUrl: requiresDoc ? documentUrl : undefined,
      documentType,
      paymentPhotoUrl: requiresPay ? paymentPhotoUrl : undefined,
      status: "pending"
    });
    
    await createNotification({
      audience: "admin",
      type: "enrollment_request",
      title: "New enrollment verification request",
      message: `User ${fullName} requested enrollment for ${course.title}.`,
      link: "/admin/course-requests"
    });

    await recordActivity(req, {
      action: "create",
      source: "public",
      section: "course-requests",
      resource: "course-requests",
      resourceId: String(request._id),
      label: `${fullName} requested enrolment in ${course.title}`,
      after: request.toObject ? request.toObject() : request
    });
    
    res.status(201).json({ success: true, request, message: "Your enrollment verification request has been submitted successfully." });
  })
);

app.get(
  "/api/course-requests/my-requests",
  protect,
  asyncHandler(async (req, res) => {
    const requests = await CourseEnrollmentRequest.find({ student: req.user._id }).populate("course", "title slug thumbnail").sort({ submittedAt: -1 }).lean();
    res.json({ success: true, items: requests });
  })
);

app.put(
  "/api/admin/course-requests/:id/approve",
  protect,
  authorize("main_admin"),
  asyncHandler(async (req, res) => {
    const request = await CourseEnrollmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    
    request.status = "approved";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: request.student, course: request.course },
      { student: request.student, course: request.course, status: "active", enrolledAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    const course = await Course.findById(request.course);
    await createNotification({
      user: request.student,
      type: "request_approved",
      title: "Verification Request Approved",
      message: `Your verification request for ${course?.title || "the course"} has been approved. You are now enrolled!`,
      link: `/student/my-courses`
    });
    
    res.json({ success: true, message: "User has been verified and enrolled successfully.", request, enrollment });
  })
);

app.put(
  "/api/admin/course-requests/:id/reject",
  protect,
  authorize("main_admin"),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Rejection reason is required." });
    }
    
    const request = await CourseEnrollmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    
    request.status = "rejected";
    request.rejectionReason = reason;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    
    const course = await Course.findById(request.course);
    await createNotification({
      user: request.student,
      type: "request_rejected",
      title: "Verification Request Rejected",
      message: `Your verification request for ${course?.title || "the course"} was rejected. Reason: ${reason}`,
      link: `/courses/${course?.slug}`
    });
    
    res.json({ success: true, message: "Verification request rejected successfully.", request });
  })
);

app.put(
  "/api/admin/course-requests/:id/disapprove",
  protect,
  authorize("main_admin"),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    
    const request = await CourseEnrollmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    
    request.status = "rejected";
    request.rejectionReason = reason || "Access revoked by admin.";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    
    await Enrollment.findOneAndDelete({ student: request.student, course: request.course });
    
    const course = await Course.findById(request.course);
    await createNotification({
      user: request.student,
      type: "request_rejected",
      title: "Enrollment Revoked / Disapproved",
      message: `Your enrollment access for ${course?.title || "the course"} was suspended/disapproved by admin. Reason: ${request.rejectionReason}`,
      link: `/courses/${course?.slug || ""}`
    });
    
    res.json({ success: true, message: "Request disapproved and enrollment successfully revoked.", request });
  })
);

app.get(
  "/api/student/my-courses",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ student: req.user._id }).populate({ path: "course", populate: { path: "teacher", select: "name profileImage" } }).lean();
    const items = await Promise.all(enrollments.filter((item) => item.course).map(async (enrollment) => ({ ...enrollment, progress: await progressSummary(req.user._id, enrollment.course._id) })));
    res.json({ success: true, items });
  })
);
app.get(
  "/api/student/dashboard",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const data = await (await fetchLikeStudentCourses(req.user._id));
    res.json({ success: true, dashboard: data });
  })
);
const fetchLikeStudentCourses = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId }).populate({ path: "course", populate: { path: "teacher", select: "name profileImage" } }).lean();
  const courses = await Promise.all(enrollments.filter((item) => item.course).map(async (enrollment) => ({ ...enrollment, progress: await progressSummary(studentId, enrollment.course._id) })));
  return {
    totalEnrolledCourses: courses.length,
    completedCourses: courses.filter((item) => item.progress.percent === 100).length,
    inProgressCourses: courses.filter((item) => item.progress.percent > 0 && item.progress.percent < 100).length,
    certificatesEarned: courses.filter((item) => item.progress.percent === 100).length,
    lastWatchedLesson: courses.find((item) => item.progress.lastLesson)?.progress.lastLesson || null,
    courses
  };
};

app.get(
  "/api/student/dashboard/analytics",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const progressList = await Progress.find({ student: req.user._id })
      .populate("lesson", "title duration")
      .populate("course", "title")
      .lean();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        dateStr: d.toISOString().split("T")[0],
        dayName: days[d.getDay()],
        watchSeconds: 0,
        lessonsCompleted: 0
      });
    }

    for (const record of progressList) {
      if (record.lastWatchedAt) {
        const recordDate = new Date(record.lastWatchedAt).toISOString().split("T")[0];
        const dayBucket = last7Days.find((day) => day.dateStr === recordDate);
        if (dayBucket) {
          dayBucket.watchSeconds += record.watchSeconds || 0;
        }
      }
      if (record.isCompleted && record.completedAt) {
        const recordDate = new Date(record.completedAt).toISOString().split("T")[0];
        const dayBucket = last7Days.find((day) => day.dateStr === recordDate);
        if (dayBucket) {
          dayBucket.lessonsCompleted += 1;
        }
      }
    }

    res.json({
      success: true,
      weeklyActivity: last7Days,
      progressList
    });
  })
);

app.get(
  "/api/admin/student-progress",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "main_admin" && req.user.role !== "teacher" && !req.user.permissions?.canViewAnalytics) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const { course: filterCourse, student: filterStudent, status: filterStatus, q } = req.query;

    let studentIds = [];
    if (q) {
      const users = await User.find({
        $or: [
          { name: new RegExp(q, "i") },
          { email: new RegExp(q, "i") }
        ]
      }).select("_id").lean();
      studentIds = users.map((u) => u._id);
    }

    const query = {};
    if (req.user.role === "teacher") {
      const assigned = req.user.assignedCourses || [];
      if (filterCourse) {
        if (assigned.map(id => id.toString()).includes(filterCourse.toString())) {
          query.course = filterCourse;
        } else {
          return res.status(403).json({ success: false, message: "Forbidden - You do not teach this course" });
        }
      } else {
        query.course = { $in: assigned };
      }
    } else {
      if (filterCourse) query.course = filterCourse;
    }

    if (filterStudent) query.student = filterStudent;
    if (q) {
      query.student = { $in: studentIds };
    }

    const enrollments = await Enrollment.find(query)
      .populate("student", "name email role profileImage")
      .populate({ path: "course", populate: { path: "teacher", select: "name" } })
      .sort({ enrolledAt: -1 })
      .lean();

    const records = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (!enrollment.student || !enrollment.course) return null;
        const summary = await progressSummary(enrollment.student._id, enrollment.course._id);
        
        const isCompleted = summary.percent === 100;
        const isStarted = summary.percent > 0;
        let calculatedStatus = "not_started";
        if (isCompleted) {
          calculatedStatus = "completed";
        } else if (isStarted) {
          calculatedStatus = "in_progress";
        }

        if (filterStatus && filterStatus !== calculatedStatus) {
          return null;
        }

        const lastProgress = await Progress.findOne({ student: enrollment.student._id, course: enrollment.course._id })
          .sort({ lastWatchedAt: -1 })
          .populate("lesson", "title")
          .lean();

        const progressList = await Progress.find({ student: enrollment.student._id, course: enrollment.course._id }).lean();
        const totalWatchTime = Math.round(progressList.reduce((sum, r) => sum + (r.watchSeconds || 0), 0) / 60);

        return {
          enrollmentId: enrollment._id,
          student: enrollment.student,
          course: enrollment.course,
          progress: summary,
          status: calculatedStatus,
          lastActive: lastProgress ? lastProgress.lastWatchedAt : enrollment.enrolledAt,
          lastWatchedLesson: lastProgress?.lesson?.title || "None",
          totalWatchTime
        };
      })
    );

    const filteredRecords = records.filter(Boolean);

    res.json({
      success: true,
      items: filteredRecords
    });
  })
);

app.get(
  "/api/admin/student-progress/:studentId/:courseId/details",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "main_admin" && req.user.role !== "teacher" && !req.user.permissions?.canViewAnalytics) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    const { studentId, courseId } = req.params;
    const [notes, comments, progressRecords] = await Promise.all([
      Note.find({ user: studentId, course: courseId }).populate("lesson", "title").sort({ createdAt: -1 }).lean(),
      Comment.find({ user: studentId, course: courseId }).populate("lesson", "title").sort({ createdAt: -1 }).lean(),
      Progress.find({ student: studentId, course: courseId }).populate("lesson", "title").sort({ createdAt: 1 }).lean()
    ]);
    res.json({ success: true, notes, comments, progress: progressRecords });
  })
);
app.post(
  "/api/student/progress/complete",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const { courseId, lessonId } = req.body;
    if (!courseId || !lessonId) return res.status(400).json({ success: false, message: "Course ID and lesson ID are required" });
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId, status: "active" });
    if (!enrollment) return res.status(403).json({ success: false, message: "Enroll in this course first" });
    const progress = await Progress.findOneAndUpdate(
      { student: req.user._id, course: courseId, lesson: lessonId },
      { student: req.user._id, course: courseId, lesson: lessonId, isCompleted: true, status: "completed", watchPercent: 100, completedAt: new Date(), lastWatchedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const summary = await progressSummary(req.user._id, courseId);
    if (summary.percent === 100) await Enrollment.findByIdAndUpdate(enrollment._id, { status: "completed", completedAt: new Date() });
    res.json({ success: true, progress, summary, message: "Lesson marked as complete" });
  })
);
app.get("/api/student/progress/:courseId", protect, authorizeLearner, asyncHandler(async (req, res) => res.json({ success: true, records: await Progress.find({ student: req.user._id, course: req.params.courseId }).populate("lesson", "title slug").lean(), summary: await progressSummary(req.user._id, req.params.courseId) })));

app.get(
  "/api/progress/:courseId/:lessonId",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const progress = await Progress.findOne({ student: req.user._id, course: req.params.courseId, lesson: req.params.lessonId }).lean();
    res.json({ success: true, progress: progress || null });
  })
);

app.post(
  "/api/progress",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const { courseId, lessonId, lastPosition: reqLastPosition, duration: reqDuration, watchedIntervals: reqIntervals, interval: reqSingleInterval } = req.body;
    if (!courseId || !lessonId) return res.status(400).json({ success: false, message: "Course ID and lesson ID are required" });
    
    const lastPosition = Number(reqLastPosition || 0);
    const duration = Math.max(Number(reqDuration || 0), 0);

    const [enrollment, lesson] = await Promise.all([learnerEnrollment(req.user._id, courseId), Lesson.findById(lessonId).lean()]);
    if (!enrollment) return res.status(403).json({ success: false, message: "Enroll in this course first" });
    if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });

    let progress = await Progress.findOne({ student: req.user._id, course: courseId, lesson: lessonId });
    if (!progress) {
      progress = new Progress({
        student: req.user._id,
        course: courseId,
        lesson: lessonId,
        watchedIntervals: []
      });
    }

    if (lastPosition <= (progress.maxWatchedSeconds || 0) + 15) {
      progress.maxWatchedSeconds = Math.max(progress.maxWatchedSeconds || 0, lastPosition);
    } else {
      // Trying to skip ahead too far, ignore lastPosition for maxWatchedSeconds update
    }

    let intervalsToMerge = [...(progress.watchedIntervals || [])];
    if (Array.isArray(reqIntervals)) {
      intervalsToMerge = [...intervalsToMerge, ...reqIntervals];
    }
    if (reqSingleInterval && reqSingleInterval.start !== undefined && reqSingleInterval.end !== undefined) {
      intervalsToMerge.push(reqSingleInterval);
    }

    progress.watchedIntervals = mergeIntervals(intervalsToMerge);
    const watchSeconds = getWatchedSeconds(progress.watchedIntervals);
    const positionPercent = duration ? Math.min(Math.round((lastPosition / duration) * 100), 100) : 0;
    const intervalPercent = duration ? Math.min(Math.round((watchSeconds / duration) * 100), 100) : 0;
    const watchPercent = Math.max(intervalPercent, positionPercent);

    const threshold = Number(lesson.completionThreshold || 90);
    const isCompleted = progress.isCompleted || watchPercent >= threshold;

    progress.lastPosition = lastPosition;
    progress.duration = duration;
    progress.watchPercent = watchPercent;
    progress.watchSeconds = watchSeconds;

    if (isCompleted && !progress.isCompleted) {
      progress.completedAt = new Date();
    }
    progress.isCompleted = isCompleted;
    progress.status = isCompleted ? "completed" : watchPercent > 0 || lastPosition > 0 ? "in_progress" : "not_started";
    progress.lastWatchedAt = new Date();

    await progress.save();

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
    let watchLog = await WatchLog.findOne({ user: req.user._id, lesson: lessonId, sessionStart: { $gte: thirtyMinsAgo } }).sort({ sessionStart: -1 });
    if (!watchLog) {
      watchLog = new WatchLog({ user: req.user._id, course: courseId, lesson: lessonId, sessionStart: new Date(), deviceInfo: req.headers["user-agent"] });
    }
    watchLog.sessionEnd = new Date();
    watchLog.totalWatchedSeconds = watchSeconds;
    watchLog.lastPosition = lastPosition;
    watchLog.isCompleted = isCompleted;
    await watchLog.save();

    const summary = await progressSummary(req.user._id, courseId);
    if (summary.percent === 100) {
      await Enrollment.findByIdAndUpdate(enrollment._id, { status: "completed", completedAt: new Date() });
    } else {
      await Enrollment.findByIdAndUpdate(enrollment._id, { status: "active", completedAt: null });
    }

    res.json({ success: true, progress, summary });
  })
);

app.post("/api/progress/complete", protect, authorizeLearner, asyncHandler(async (req, res) => {
  const { courseId, lessonId, watchPercent: reqWatchPercent } = req.body;
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });

  let progress = await Progress.findOne({ student: req.user._id, course: courseId, lesson: lessonId });
  if (!progress) {
    progress = new Progress({ student: req.user._id, course: courseId, lesson: lessonId, watchPercent: 0 });
  }

  if (reqWatchPercent !== undefined) {
    progress.watchPercent = Math.max(progress.watchPercent || 0, Number(reqWatchPercent));
  }
  
  const hasVideo = !!(lesson.videoUrl || lesson.youtubeUrl || lesson.uploadedVideo);
  const threshold = hasVideo ? Number(lesson.videoSettings?.completionThreshold || lesson.completionThreshold || 80) : 0;
  
  if (!hasVideo || progress.watchPercent >= threshold || progress.isCompleted) {
    const CourseContent = mongoose.model("CourseContent");
    const hasContentExam = await CourseContent.exists({ lesson: lessonId, type: "exam", isActive: true });
    const hasExam = !!lesson.examPaper || !!hasContentExam;

    if (!hasExam || progress.isCompleted) {
      progress.isCompleted = true;
      progress.status = "completed";
      progress.completedAt = progress.completedAt || new Date();
    } else {
      progress.status = "in_progress";
    }
    
    await progress.save();
    const summary = await progressSummary(req.user._id, courseId);
    if (summary.percent === 100) {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId, status: "active" });
      if (enrollment) {
        await Enrollment.findByIdAndUpdate(enrollment._id, { status: "completed", completedAt: new Date() });
      }
    }
    res.json({ success: true, progress, summary, message: "Marked as complete" });
  } else {
    res.status(400).json({ success: false, message: "Watch at least " + threshold + "% of the video to complete." });
  }
}));

app.get("/api/quiz/:lessonId", protect, authorizeLearner, asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).lean();
  if (!lesson || !lesson.quizSettings?.hasQuiz) return res.status(404).json({ success: false, message: "No quiz found for this lesson" });

  const numQuestions = lesson.quizSettings.questionsPerAttempt || 10;
  
  let attempt = await QuizAttempt.findOne({ user: req.user._id, lesson: req.params.lessonId, status: "pending_review" });
  if (!attempt) {
    const questions = await Question.aggregate([
      { $match: { lesson: lesson._id, isActive: true } },
      { $sample: { size: numQuestions } }
    ]);
    
    if (questions.length === 0) return res.status(404).json({ success: false, message: "No questions in bank" });

    attempt = await QuizAttempt.create({
      user: req.user._id,
      course: lesson.course,
      lesson: lesson._id,
      questionsServed: questions.map(q => q._id),
      answersSubmitted: [],
      attemptNumber: (await QuizAttempt.countDocuments({ user: req.user._id, lesson: lesson._id })) + 1
    });
  }

  const populatedAttempt = await QuizAttempt.findById(attempt._id).populate("questionsServed", "-correctAnswer -explanation");
  
  if (lesson.quizSettings.randomOrder) {
    populatedAttempt.questionsServed = populatedAttempt.questionsServed.sort(() => Math.random() - 0.5);
  }

  res.json({ success: true, attempt: populatedAttempt, settings: lesson.quizSettings });
}));

app.post("/api/quiz/:lessonId/submit", protect, authorizeLearner, asyncHandler(async (req, res) => {
  const { attemptId, answers } = req.body;
  const attempt = await QuizAttempt.findById(attemptId).populate("questionsServed");
  const lesson = await Lesson.findById(req.params.lessonId).lean();

  if (!attempt || attempt.status !== "pending_review") return res.status(400).json({ success: false, message: "Invalid attempt" });

  let score = 0;
  let totalMarks = 0;
  const answersSubmitted = [];

  attempt.questionsServed.forEach(q => {
    const ans = answers.find(a => a.questionId === q._id.toString());
    let isCorrect = false;
    let marksAwarded = 0;

    if (ans) {
      if (q.type === "mcq") {
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt && correctOpt._id.toString() === ans.selectedOption) {
          isCorrect = true;
          marksAwarded = q.marks || 1;
        }
      } else {
        // Short answer needs manual review, marksAwarded = 0 for now
      }
    }
    
    score += marksAwarded;
    totalMarks += (q.marks || 1);
    
    answersSubmitted.push({
      question: q._id,
      selectedOption: ans?.selectedOption,
      shortAnswerText: ans?.shortAnswerText,
      isCorrect,
      marksAwarded
    });
  });

  const percentage = (score / totalMarks) * 100;
  const passPercentage = lesson.quizSettings?.passPercentage || 80;
  const passed = percentage >= passPercentage;

  attempt.answersSubmitted = answersSubmitted;
  attempt.totalMarks = totalMarks;
  attempt.score = percentage;
  attempt.status = passed ? "passed" : "failed";
  await attempt.save();

  if (passed) {
    const progress = await Progress.findOne({ student: req.user._id, lesson: lesson._id });
    if (progress) {
      progress.quizPassed = true;
      await progress.save();
    }
  }

  res.json({ success: true, attempt });
}));

app.get(
  "/api/lessons/:lessonId/notes",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const query = { user: req.user._id, lesson: req.params.lessonId };
    if (req.query.q) {
      query.$or = [
        { title: new RegExp(req.query.q, "i") },
        { content: new RegExp(req.query.q, "i") }
      ];
    }

    let sortObj = { timestamp: 1 };
    if (req.query.sort === "newest") {
      sortObj = { createdAt: -1 };
    } else if (req.query.sort === "oldest") {
      sortObj = { createdAt: 1 };
    }

    const notes = await Note.find(query).sort(sortObj).lean();
    res.json({ success: true, items: notes });
  })
);

app.get("/api/me/notes", protect, authorizeLearner, asyncHandler(async (req, res) => {
  const notes = await Note.find({ user: req.user._id }).populate("course", "title slug").populate("lesson", "title slug").sort({ updatedAt: -1 }).limit(100).lean();
  res.json({ success: true, items: notes });
}));

app.post(
  "/api/notes",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const lesson = await findLessonWithCourse(req.body.lessonId);
    if (lesson.notesEnabled === false) return res.status(403).json({ success: false, message: "Notes are disabled for this lesson" });
    const note = await Note.create({ user: req.user._id, course: req.body.courseId || lesson.course, lesson: lesson._id, title: req.body.title, content: req.body.content, timestamp: Number(req.body.timestamp || 0) });
    res.status(201).json({ success: true, item: note });
  })
);

app.put(
  "/api/notes/:id",
  protect,
  authorizeLearner,
  asyncHandler(async (req, res) => {
    const updateFields = { title: req.body.title, content: req.body.content };
    if (req.body.timestamp !== undefined) {
      updateFields.timestamp = Number(req.body.timestamp);
    }
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ success: false, message: "Note not found" });
    res.json({ success: true, item: note });
  })
);

app.delete("/api/notes/:id", protect, authorizeLearner, asyncHandler(async (req, res) => {
  await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true, message: "Note deleted" });
}));

app.get(
  "/api/lessons/:lessonId/comments",
  optionalUser,
  asyncHandler(async (req, res) => {
    const comments = await Comment.find({ lesson: req.params.lessonId, status: { $in: ["visible", "replied", "pending", "resolved"] } }).populate("user", "name role profileImage").populate("adminReplyUser", "name role profileImage").sort({ createdAt: req.query.sort === "oldest" ? 1 : -1 }).limit(150).lean();
    res.json({ success: true, items: comments });
  })
);

app.post(
  "/api/lessons/:lessonId/comments",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.status !== "active") return res.status(403).json({ success: false, message: "Blocked users cannot comment" });
    const lesson = await findLessonWithCourse(req.params.lessonId);
    if (lesson.commentsEnabled === false) return res.status(403).json({ success: false, message: "Comments are disabled for this lesson" });
    const text = String(req.body.text || "").trim();
    if (text.length < 2) return res.status(400).json({ success: false, message: "Comment is too short" });
    if (text.length > 1200) return res.status(400).json({ success: false, message: "Comment is too long" });
    const recentCount = await Comment.countDocuments({ user: req.user._id, createdAt: { $gte: new Date(Date.now() - 60 * 1000) } });
    if (recentCount >= 5) return res.status(429).json({ success: false, message: "Please slow down before posting more comments" });
    const comment = await Comment.create({ user: req.user._id, course: req.body.courseId || lesson.course, lesson: lesson._id, parentComment: req.body.parentComment || null, text });
    await createNotification({ audience: "admin", type: "new_comment", title: "New lesson comment", message: `${req.user.name} commented on ${lesson.title}.`, link: "/admin/comments" });
    res.status(201).json({ success: true, item: await comment.populate("user", "name role profileImage") });
  })
);

app.delete(
  "/api/comments/:id",
  protect,
  asyncHandler(async (req, res) => {
    const filter = canManageCourseArea(req.user) ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
    const item = await Comment.findOneAndUpdate(filter, { status: "deleted", moderatedBy: req.user._id, moderatedAt: new Date() }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Comment not found" });
    res.json({ success: true, message: "Comment deleted" });
  })
);

app.get(
  "/api/courses/:courseId/chat/messages",
  protect,
  asyncHandler(async (req, res) => {
    const course = await Course.findOne(idOrSlug(req.params.courseId)).lean();
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (!(await requireCourseMember(req, course._id))) return res.status(403).json({ success: false, message: "Enroll in this course to access chat" });
    const room = await getOrCreateChatRoom(course);
    if (!room.isEnabled && !canManageCourseArea(req.user)) return res.status(403).json({ success: false, message: "Course chat is disabled" });
    const messages = await ChatMessage.find({ room: room._id, deletedAt: null }).populate("sender", "name role profileImage").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, room, items: messages.reverse() });
  })
);

app.post(
  "/api/courses/:courseId/chat/messages",
  protect,
  asyncHandler(async (req, res) => {
    const course = await Course.findOne(idOrSlug(req.params.courseId)).lean();
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (!(await requireCourseMember(req, course._id))) return res.status(403).json({ success: false, message: "Enroll in this course to access chat" });
    const room = await getOrCreateChatRoom(course);
    if (!room.isEnabled && !canManageCourseArea(req.user)) return res.status(403).json({ success: false, message: "Course chat is disabled" });
    const text = String(req.body.text || "").trim();
    if (!text && !req.body.fileUrl) return res.status(400).json({ success: false, message: "Message or file is required" });
    const message = await ChatMessage.create({ room: room._id, course: course._id, sender: req.user._id, text, fileUrl: req.body.fileUrl, fileType: req.body.fileType, fileName: req.body.fileName, isAnnouncement: Boolean(req.body.isAnnouncement && canManageCourseArea(req.user)) });
    res.status(201).json({ success: true, item: await message.populate("sender", "name role profileImage") });
  })
);

app.delete("/api/chat/messages/:id", protect, asyncHandler(async (req, res) => {
  const filter = canManageCourseArea(req.user) ? { _id: req.params.id } : { _id: req.params.id, sender: req.user._id };
  const message = await ChatMessage.findOneAndUpdate(filter, { deletedAt: new Date(), deletedBy: req.user._id }, { new: true });
  if (!message) return res.status(404).json({ success: false, message: "Message not found" });
  res.json({ success: true, message: "Message deleted" });
}));

app.get("/api/notifications", protect, asyncHandler(async (req, res) => {
  const audience = req.user.role === "main_admin" ? "admin" : "user";
  const items = await Notification.find({ $or: [{ user: req.user._id }, { audience }, { audience: "all" }] }).sort({ createdAt: -1 }).limit(80).lean();
  res.json({ success: true, items });
}));

app.put("/api/notifications/:id/read", protect, asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, $or: [{ user: req.user._id }, { audience: req.user.role === "main_admin" ? "admin" : "user" }, { audience: "all" }] }, { read: true, readAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, item });
}));

app.delete("/api/notifications/:id", protect, asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true, message: "Notification deleted" });
}));

app.get("/api/preachers", asyncHandler((req, res) => list(req, res, Preacher, { status: "active", ...(req.query.homepage === "true" ? { showOnHomepage: true } : {}) })));
app.get("/api/preachers/:slug", asyncHandler(async (req, res) => {
  const preacher = await Preacher.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!preacher) return res.status(404).json({ success: false, message: "Preacher not found" });
  const courses = preacher.user ? await Course.find({ teacher: preacher.user, ...activeCourseFilter() }).sort({ order: 1 }).lean() : [];
  res.json({ success: true, preacher: { ...preacher, courses } });
}));

app.get("/api/visionaries", asyncHandler((req, res) => list(req, res, Preacher, { status: "active", ...(req.query.homepage === "true" ? { showOnHomepage: true } : {}) }, { sort: { type: 1, sortOrder: 1, createdAt: -1 } })));
app.get("/api/visionaries/:slug", asyncHandler(async (req, res) => {
  const visionary = await Preacher.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!visionary) return res.status(404).json({ success: false, message: "Visionary not found" });
  const courses = visionary.user ? await Course.find({ teacher: visionary.user, ...activeCourseFilter() }).sort({ order: 1 }).lean() : [];
  res.json({ success: true, visionary: { ...visionary, courses } });
}));
app.get("/api/blogs", asyncHandler((req, res) => {
  const filter = { status: "published" };
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [{ title: regex }, { shortDescription: regex }, { category: regex }, { tags: regex }];
  }
  return list(req, res, Blog, filter, { populate: { path: "author", select: "name profileImage" }, sort: { featured: -1, createdAt: -1 } });
}));
app.get("/api/blogs/:slug", asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: "published" }).populate("author", "name profileImage").lean();
  if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
  const relatedBlogs = await Blog.find({ _id: { $ne: blog._id }, category: blog.category, status: "published" }).limit(3).lean();
  res.json({ success: true, blog: { ...blog, relatedBlogs } });
}));
app.get("/api/video-blogs", asyncHandler((req, res) => {
  const filter = { status: "published" };
  if (req.query.homepage === "true") filter.showOnHomepage = true;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [{ title: regex }, { shortDescription: regex }, { category: regex }, { speaker: regex }, { tags: regex }];
  }
  return list(req, res, VideoBlog, filter, {
    sort: { featured: -1, sortOrder: 1, createdAt: -1 },
    decorate: decorateVideoBlog
  });
}));
/* Drives the category chips on the videos page. */
app.get("/api/video-blogs-filters", asyncHandler(async (req, res) => {
  const [categories, speakers] = await Promise.all([
    VideoBlog.distinct("category", { status: "published", category: { $nin: [null, ""] } }),
    VideoBlog.distinct("speaker", { status: "published", speaker: { $nin: [null, ""] } })
  ]);
  res.json({ success: true, categories: categories.sort(), speakers: speakers.sort() });
}));
app.get("/api/video-blogs/:slug", asyncHandler(async (req, res) => {
  const videoBlog = await VideoBlog.findOne({ slug: req.params.slug, status: "published" }).lean();
  if (!videoBlog) return res.status(404).json({ success: false, message: "Video blog not found" });
  const relatedVideos = await VideoBlog.find({ _id: { $ne: videoBlog._id }, status: "published" })
    .sort({ featured: -1, sortOrder: 1, createdAt: -1 })
    .limit(3)
    .lean();
  res.json({
    success: true,
    videoBlog: { ...decorateVideoBlog(videoBlog), relatedVideos: relatedVideos.map(decorateVideoBlog) }
  });
}));
app.get("/api/gallery/images", asyncHandler((req, res) => list(req, res, ImageGallery, { status: "active", ...(req.query.highlight === "true" ? { showInMediaHighlight: true } : {}) })));
app.get("/api/gallery/videos", asyncHandler((req, res) => list(req, res, VideoGallery, { status: "active", ...(req.query.highlight === "true" ? { showInMediaHighlight: true } : {}) })));
app.post("/api/subscribers", asyncHandler(async (req, res) => {
  if (!req.body.email) return res.status(400).json({ success: false, message: "Email is required" });
  const subscriber = await Subscriber.findOneAndUpdate({ email: req.body.email.toLowerCase() }, { email: req.body.email.toLowerCase(), status: "active", subscribedDate: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await recordActivity(req, {
    action: "create",
    source: "public",
    section: "subscribers",
    resource: "subscribers",
    resourceId: String(subscriber._id),
    userName: req.body.email,
    label: `${req.body.email} subscribed to the newsletter`
  });
  res.status(201).json({ success: true, subscriber, message: "Subscribed successfully" });
}));
app.post("/api/contact", asyncHandler(async (req, res) => {
  if (!req.body.name || !req.body.email || !req.body.message) return res.status(400).json({ success: false, message: "Name, email and message are required" });
  const contactMessage = await ContactMessage.create(req.body);
  /* The same endpoint carries both plain enquiries and Sunday class
     registrations; classTitle is what tells them apart. */
  const isClassRegistration = Boolean(req.body.classTitle);
  await recordActivity(req, {
    action: "create",
    source: "public",
    section: isClassRegistration ? "upcoming-classes" : "contact-messages",
    resource: "contact-messages",
    resourceId: String(contactMessage._id),
    userName: req.body.name,
    label: isClassRegistration
      ? `${req.body.name} registered for ${req.body.classTitle}`
      : `${req.body.name} sent an enquiry`,
    after: contactMessage.toObject ? contactMessage.toObject() : contactMessage
  });
  res.status(201).json({ success: true, contactMessage, message: "Message sent successfully" });
}));
app.get("/api/legal/:slug", asyncHandler(async (req, res) => {
  const legalPage = await LegalPage.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!legalPage) return res.status(404).json({ success: false, message: "Legal page not found" });
  res.json({ success: true, legalPage });
}));
app.get("/api/pages/:slug", asyncHandler(async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!page) return res.status(404).json({ success: false, message: "Page not found" });
  res.json({ success: true, page });
}));
app.post("/api/traffic/track", asyncHandler(async (req, res) => {
  await TrafficLog.create({ pageUrl: req.body.pageUrl, referrer: req.body.referrer, ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress, browser: req.headers["user-agent"], deviceType: req.body.deviceType });
  res.status(201).json({ success: true });
}));

const teacherCourseIds = async (user) => {
  const filter = user.role === "main_admin" ? {} : { teacher: user._id };
  return (await Course.find(filter).select("_id").lean()).map((course) => course._id);
};
app.get("/api/teacher/dashboard", protect, authorize("teacher", "main_admin"), asyncHandler(async (req, res) => {
  const filter = req.user.role === "main_admin" ? {} : { teacher: req.user._id };
  const courses = await Course.find(filter).populate("teacher", "name email profileImage").lean();
  const ids = courses.map((course) => course._id);
  const [totalLessons, enrollments, recentEnrollments] = await Promise.all([
    Lesson.countDocuments({ course: { $in: ids } }),
    Enrollment.find({ course: { $in: ids } }).populate("student", "name email profileImage").lean(),
    Enrollment.find({ course: { $in: ids } }).populate("student", "name email profileImage").populate("course", "title slug").sort({ createdAt: -1 }).limit(8).lean()
  ]);
  res.json({ success: true, dashboard: { assignedCourses: courses.length, totalStudents: new Set(enrollments.map((item) => item.student?._id?.toString())).size, totalLessons, recentEnrollments, courses } });
}));
app.get("/api/teacher/courses", protect, authorize("teacher", "main_admin"), asyncHandler(async (req, res) => {
  const filter = req.user.role === "main_admin" ? {} : { teacher: req.user._id };
  res.json({ success: true, items: await Course.find(filter).populate("teacher", "name email").sort({ createdAt: -1 }).lean() });
}));
app.get("/api/teacher/lessons", protect, authorize("teacher", "main_admin"), asyncHandler(async (req, res) => res.json({ success: true, items: await Lesson.find({ course: { $in: await teacherCourseIds(req.user) } }).populate("course", "title slug").sort({ order: 1, sortOrder: 1 }).lean() })));
app.get("/api/teacher/students", protect, authorize("teacher", "main_admin"), requirePermission("canViewStudents"), asyncHandler(async (req, res) => res.json({ success: true, items: await Enrollment.find({ course: { $in: await teacherCourseIds(req.user) } }).populate("student", "name email phone").populate("course", "title slug").lean() })));
app.post("/api/teacher/lessons", protect, authorize("teacher", "main_admin"), requirePermission("canCreateLesson"), asyncHandler(async (req, res) => {
  const course = req.user.role === "main_admin" ? await Course.findById(req.body.course) : await Course.findOne({ _id: req.body.course, teacher: req.user._id });
  if (!course) return res.status(403).json({ success: false, message: "You can only manage assigned courses" });
  const item = await Lesson.create(prepareLessonBody(req.body, course._id, req.user._id, true));
  res.status(201).json({ success: true, item });
}));
app.get("/api/teacher/blogs", protect, authorize("teacher", "main_admin"), asyncHandler(async (req, res) => {
  const filter = req.user.role === "main_admin" ? {} : { author: req.user._id };
  res.json({ success: true, items: await Blog.find(filter).populate("author", "name email").sort({ createdAt: -1 }).lean() });
}));
app.post("/api/teacher/blogs", protect, authorize("teacher", "main_admin"), requirePermission("canCreateBlog"), asyncHandler(async (req, res) => res.status(201).json({ success: true, item: await Blog.create({ ...req.body, slug: req.body.slug || slugify(req.body.title), author: req.user._id }) })));
app.put("/api/teacher/blogs/:id", protect, authorize("teacher", "main_admin"), requirePermission("canCreateBlog"), asyncHandler(async (req, res) => {
  const filter = req.user.role === "main_admin" ? { _id: req.params.id } : { _id: req.params.id, author: req.user._id };
  res.json({ success: true, item: await Blog.findOneAndUpdate(filter, { ...req.body, slug: req.body.slug || slugify(req.body.title) }, { new: true, runValidators: true }) });
}));
app.delete("/api/teacher/blogs/:id", protect, authorize("teacher", "main_admin"), requirePermission("canCreateBlog"), asyncHandler(async (req, res) => {
  const filter = req.user.role === "main_admin" ? { _id: req.params.id } : { _id: req.params.id, author: req.user._id };
  await Blog.findOneAndDelete(filter);
  res.json({ success: true, message: "Blog deleted" });
}));
app.get("/api/teacher/video-blogs", protect, authorize("teacher", "main_admin"), asyncHandler(async (req, res) => res.json({ success: true, items: await VideoBlog.find().sort({ createdAt: -1 }).lean() })));
app.post("/api/teacher/video-blogs", protect, authorize("teacher", "main_admin"), requirePermission("canCreateVideoBlog"), asyncHandler(async (req, res) => res.status(201).json({ success: true, item: await VideoBlog.create({ ...req.body, slug: req.body.slug || slugify(req.body.title) }) })));

/* ============================================================
   Staff roles, section permissions and the audit trail
   ============================================================ */

/* Higher number = more authority. A staff member can only ever
   manage accounts strictly below their own level. */
const ROLE_LEVEL = {
  main_admin: 100,
  admin: 80,
  manager: 60,
  editor: 40,
  viewer: 20,
  teacher: 10,
  student: 0,
  devotee: 0,
  user: 0
};
const STAFF_ROLES = ["main_admin", "admin", "manager", "editor", "viewer"];
const isStaff = (user) => STAFF_ROLES.includes(user?.role);
const roleLevel = (user) => ROLE_LEVEL[user?.role] ?? 0;

/* Every admin area the panel can grant, keyed the way the UI routes it. */
const ADMIN_SECTIONS = [
  "dashboard", "users", "roles", "activity-log", "sessions",
  "banners", "home-sections", "about-sections", "pages",
  "courses", "lessons", "course-requests", "exams",
  "trips", "trip-bookings", "booking-taxes", "upcoming-classes",
  "visionaries", "blogs", "video-blogs", "media",
  "subscribers", "contact-messages", "comments", "chat",
  "footer", "site-settings", "traffic", "reports", "assets",
  "books", "book-orders", "book-payment-settings"
];

/* Maps an /api/admin/<resource> path onto a section key. */
const SECTION_ALIASES = {
  pilgrimages: "trips",
  "pilgrimage-bookings": "trip-bookings",
  "media/images": "media",
  "media/videos": "media",
  "gallery-images": "media",
  "gallery-videos": "media",
  preachers: "visionaries",
  "video-intro": "home-secti" + "ons",
  "trips-overview": "trips",
  "trip-stats": "trips",
  "book-orders": "book-orders",
  "book-payment-settings": "book-payment-settings",
  books: "books"
};
const sectionFor = (resource = "") => {
  const head = String(resource).split("?")[0];
  if (SECTION_ALIASES[head]) return SECTION_ALIASES[head];
  const first = head.split("/")[0];
  return SECTION_ALIASES[first] || first;
};

const ACTION_FOR_METHOD = { GET: "view", POST: "create", PUT: "edit", PATCH: "edit", DELETE: "canDelete" };

/* main_admin is never restricted. Other staff need the section
   granted, with the right verb on it. */
const canAccessSection = (user, section, action = "view") => {
  if (!user) return false;
  if (user.role === "main_admin") return true;
  if (!isStaff(user)) return false;
  const grant = (user.sectionAccess || []).find((g) => g.section === section);
  if (!grant) return false;
  if (action === "view") return grant.view !== false;
  return Boolean(grant[action]);
};

/* Replaces the old main_admin-only gate on /api/admin/*. */
const staffGate = (req, res, next) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  if (req.user.role === "main_admin") return next();

  const section = sectionFor(req.params.resource || req.path.replace(/^\/api\/admin\//, ""));
  const action = ACTION_FOR_METHOD[req.method] || "view";
  if (!canAccessSection(req.user, section, action)) {
    return res.status(403).json({
      success: false,
      message:
        action === "view"
          ? "You do not have access to this section."
          : `You do not have permission to ${action === "canDelete" ? "delete" : action} here.`
    });
  }
  return next();
};

/* ---- request fingerprinting, used by the log and by sessions ---- */
const clientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  "";

const describeClient = (req) => {
  const ua = req.headers["user-agent"] || "";
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const os = /Windows/i.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Linux/i.test(ua) ? "Linux" : "Unknown";
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR\//i.test(ua) ? "Opera"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) ? "Safari"
    : /Firefox\//i.test(ua) ? "Firefox" : "Unknown";
  return { ip: clientIp(req), userAgent: ua, device: tablet ? "Tablet" : mobile ? "Mobile" : "Desktop", browser, os };
};

/* A short human label so the log reads without opening each row. */
const labelFor = (doc = {}) =>
  doc.title || doc.name || doc.label || doc.email || doc.sectionTitle || doc.bookingRef || doc.question || "";

const recordActivity = async (req, payload) => {
  try {
    const client = describeClient(req);
    await ActivityLog.create({
      user: req.user?._id,
      /* A public action may come from someone not signed in, so fall
         back to the name they typed on the form. */
      userName: req.user?.name || payload.userName || "Website visitor",
      userRole: req.user?.role || "visitor",
      method: req.method,
      path: req.originalUrl,
      ...client,
      ...payload
    });
  } catch {
    /* logging must never break the request it describes */
  }
};

const adminOnly = [protect, staffGate];

/* Mount Books module routes */
app.use("/api", booksRouter);
attachProtectedBookRoutes(app, protect);
attachAdminBookRoutes(app, adminOnly);

app.post("/api/admin/upload", ...adminOnly, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  const file = { url: `/uploads/${req.file.path.split("/uploads/")[1]}`, filename: req.file.filename };
  await FileUpload.create({ user: req.user._id, ...file, folder: cleanUploadFolder(req.query.folder), mimeType: req.file.mimetype, size: req.file.size }).catch(() => null);
  res.status(201).json({ success: true, file });
}));
app.get("/api/admin/dashboard/stats", ...adminOnly, asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [totalUsers, totalStudents, totalTeachers, activeUsers, blockedUsers, pendingUsers, totalCourses, totalLessons, totalBlogs, totalVideoBlogs, totalSubscribers, totalContactMessages, totalVisits, todayVisits, monthlyVisits, totalNotes, totalComments, totalChatMessages, pendingResetRequests, completedLessons, totalHomeSections, userGrowth, enrollmentGrowth, trafficByDay, popularPages, popularCourses, recentUsers, recentContacts] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: { $in: learnerRoles } }), User.countDocuments({ role: "teacher" }), User.countDocuments({ status: "active" }), User.countDocuments({ status: "blocked" }), User.countDocuments({ status: "pending" }), Course.countDocuments(), Lesson.countDocuments(), Blog.countDocuments(), VideoBlog.countDocuments(), Subscriber.countDocuments(), ContactMessage.countDocuments(), TrafficLog.countDocuments(), TrafficLog.countDocuments({ createdAt: { $gte: today } }), TrafficLog.countDocuments({ createdAt: { $gte: monthStart } }), Note.countDocuments(), Comment.countDocuments(), ChatMessage.countDocuments(), PasswordResetRequest.countDocuments({ status: "pending" }), Progress.countDocuments({ isCompleted: true }), PageSection.countDocuments(),
    User.aggregate([{ $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, users: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]),
    Enrollment.aggregate([{ $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, enrollments: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]),
    TrafficLog.aggregate([{ $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } }, visits: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]),
    TrafficLog.aggregate([{ $group: { _id: "$pageUrl", visits: { $sum: 1 } } }, { $sort: { visits: -1 } }, { $limit: 8 }]),
    Enrollment.aggregate([{ $group: { _id: "$course", enrollments: { $sum: 1 } } }, { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } }, { $unwind: "$course" }, { $project: { title: "$course.title", enrollments: 1 } }, { $limit: 6 }]),
    User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt").lean(),
    ContactMessage.find().sort({ createdAt: -1 }).limit(5).lean()
  ]);
  res.json({ success: true, stats: { totalUsers, totalStudents, totalTeachers, activeUsers, blockedUsers, pendingUsers, totalCourses, totalLessons, completedLessons, totalBlogs, totalVideoBlogs, totalSubscribers, totalContactMessages, totalNotes, totalComments, totalChatMessages, pendingResetRequests, totalVisits, todayVisits, monthlyVisits, totalHomeSections }, charts: { userGrowth, enrollmentGrowth, trafficByDay, popularPages, popularCourses }, recentActivity: { users: recentUsers, contacts: recentContacts } });
}));

app.get("/api/admin/users", ...adminOnly, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.role && req.query.role !== "all") filter.role = req.query.role;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }, { mobile: regex }];
  }
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "30", 10), 1), 100);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  const enrollmentCounts = await Enrollment.aggregate([{ $match: { student: { $in: items.map((item) => item._id) } } }, { $group: { _id: "$student", courses: { $sum: 1 } } }]);
  const progressCounts = await Progress.aggregate([{ $match: { student: { $in: items.map((item) => item._id) }, isCompleted: true } }, { $group: { _id: "$student", lessonsCompleted: { $sum: 1 } } }]);
  const enrollmentMap = new Map(enrollmentCounts.map((item) => [item._id.toString(), item.courses]));
  const progressMap = new Map(progressCounts.map((item) => [item._id.toString(), item.lessonsCompleted]));
  res.json({ success: true, items: items.map((item) => ({ ...item, enrolledCourses: enrollmentMap.get(item._id.toString()) || 0, lessonsCompleted: progressMap.get(item._id.toString()) || 0 })), total, page, pages: Math.ceil(total / limit) || 1 });
}));

app.get("/api/admin/users/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  const [enrollments, progress, notesCount, commentsCount, bookOrders] = await Promise.all([
    Enrollment.find({ student: user._id }).populate("course", "title slug thumbnail").lean(),
    Progress.find({ student: user._id }).populate("course", "title slug").populate("lesson", "title slug").lean(),
    Note.countDocuments({ user: user._id }),
    Comment.countDocuments({ user: user._id }),
    BookOrder.find({ user: user._id }).populate("book", "title slug coverImage").sort({ createdAt: -1 }).lean().catch(() => [])
  ]);
  res.json({ success: true, user: { ...user, enrollments, progress, notesCount, commentsCount, bookOrders } });
}));

app.put("/api/admin/users/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("+password");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  ["name", "email", "phone", "mobile", "role", "status", "bio", "profileImage"].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  if (req.body.password) user.password = req.body.password;
  if (req.body.emailVerified !== undefined) user.emailVerified = toBoolean(req.body.emailVerified);
  if (req.body.mustChangePassword !== undefined) user.mustChangePassword = toBoolean(req.body.mustChangePassword);
  await user.save();
  res.json({ success: true, user: userPayload(user), item: userPayload(user) });
}));

app.put("/api/admin/users/:id/block", ...adminOnly, asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot block your own account" });
  const user = await User.findByIdAndUpdate(req.params.id, { status: "blocked", blockedAt: new Date(), blockedReason: req.body.reason || "" }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  await createNotification({ user: user._id, type: "account_blocked", title: "Account blocked", message: "Your account has been blocked by admin." });
  res.json({ success: true, user: userPayload(user), message: "User blocked" });
}));

app.put("/api/admin/users/:id/unblock", ...adminOnly, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: "active", blockedAt: null, blockedReason: "" }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  await createNotification({ user: user._id, type: "account_unblocked", title: "Account active", message: "Your account has been unblocked." });
  res.json({ success: true, user: userPayload(user), message: "User unblocked" });
}));

app.put("/api/admin/users/:id/password", ...adminOnly, asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || !strongPassword(password)) return res.status(400).json({ success: false, message: "Temporary password must be at least 8 characters and include letters and numbers" });
  const user = await User.findById(req.params.id).select("+password");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  user.password = password;
  user.mustChangePassword = true;
  await user.save();
  await createNotification({ user: user._id, type: "password_updated_by_admin", title: "Temporary password set", message: "Admin updated your password. Please change it after login." });
  await sendEmail({ to: user.email, subject: "Temporary password set", text: "Admin updated your ISKCON Juhu Self-Excellence password. Please login and change it." });
  res.json({ success: true, message: "Temporary password saved. User must change it after login." });
}));

app.delete("/api/admin/users/:id", ...adminOnly, asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot delete your own account" });
  await Promise.all([
    User.findByIdAndDelete(req.params.id),
    Enrollment.deleteMany({ student: req.params.id }),
    Progress.deleteMany({ student: req.params.id }),
    Note.deleteMany({ user: req.params.id }),
    Comment.updateMany({ user: req.params.id }, { status: "deleted" }),
    ChatMessage.updateMany({ sender: req.params.id }, { deletedAt: new Date(), deletedBy: req.user._id })
  ]);
  res.json({ success: true, message: "User deleted" });
}));

app.get("/api/admin/password-reset-requests", ...adminOnly, asyncHandler(async (req, res) => {
  const filter = req.query.status && req.query.status !== "all" ? { status: req.query.status } : {};
  const items = await PasswordResetRequest.find(filter).populate("user", "name email status").populate("resolvedBy", "name").sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, items });
}));

app.put("/api/admin/password-reset-requests/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const request = await PasswordResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Request not found" });
  const status = req.body.status || (req.body.approved ? "approved" : "rejected");
  request.status = status;
  request.adminNote = req.body.adminNote || request.adminNote;
  request.resolvedBy = req.user._id;
  request.resolvedAt = new Date();
  if (status === "approved" && req.body.temporaryPassword) {
    const user = request.user ? await User.findById(request.user).select("+password") : await User.findOne({ email: request.email }).select("+password");
    if (user) {
      user.password = req.body.temporaryPassword;
      user.mustChangePassword = true;
      user.status = user.status === "pending" ? "active" : user.status;
      await user.save();
      request.user = user._id;
      request.tempPasswordSetAt = new Date();
      await createNotification({ user: user._id, type: "password_updated_by_admin", title: "Password updated", message: "Admin approved your password reset request. Please login and change your password." });
      await sendEmail({ to: user.email, subject: "Password reset approved", text: "Admin approved your password reset request. Please login and change your password." });
    }
  }
  await request.save();
  res.json({ success: true, item: request, message: `Request ${status}` });
}));

app.get("/api/admin/comments", ...adminOnly, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const items = await Comment.find(filter).populate("user", "name email role status").populate("course", "title slug").populate("lesson", "title slug").sort({ createdAt: -1 }).limit(150).lean();
  res.json({ success: true, items });
}));

app.put("/api/admin/comments/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const item = await Comment.findByIdAndUpdate(req.params.id, { status: req.body.status || "hidden", moderatedBy: req.user._id, moderatedAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: "Comment not found" });
  res.json({ success: true, item });
}));

app.get("/api/admin/chat/messages", ...adminOnly, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.courseId) filter.course = req.query.courseId;
  const items = await ChatMessage.find(filter).populate("sender", "name email role status").populate("course", "title slug").sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, items });
}));

app.put("/api/admin/chat/messages/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const item = await ChatMessage.findByIdAndUpdate(req.params.id, { pinned: Boolean(req.body.pinned), deletedAt: req.body.deleted ? new Date() : undefined, deletedBy: req.body.deleted ? req.user._id : undefined }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: "Message not found" });
  res.json({ success: true, item });
}));

app.get("/api/admin/course-reports/:courseId", ...adminOnly, asyncHandler(async (req, res) => {
  const course = await Course.findOne(idOrSlug(req.params.courseId)).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });
  const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 }).lean();
  const [enrollments, progress, totalComments, totalNotes, totalChatMessages] = await Promise.all([
    Enrollment.find({ course: course._id }).populate("student", "name email status lastActiveAt").lean(),
    Progress.find({ course: course._id }).lean(),
    Comment.countDocuments({ course: course._id }),
    Note.countDocuments({ course: course._id }),
    ChatMessage.countDocuments({ course: course._id })
  ]);
  const completedByStudent = new Map();
  progress.forEach((item) => {
    if (item.isCompleted) completedByStudent.set(item.student.toString(), (completedByStudent.get(item.student.toString()) || 0) + 1);
  });
  const studentReports = enrollments.map((enrollment) => {
    const completedLessons = completedByStudent.get(enrollment.student?._id?.toString()) || 0;
    return { student: enrollment.student, completedLessons, progressPercent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0, status: enrollment.status };
  });
  const averageCompletion = studentReports.length ? Math.round(studentReports.reduce((sum, item) => sum + item.progressPercent, 0) / studentReports.length) : 0;
  res.json({ success: true, report: { course, lessonsCount: lessons.length, enrolledUsers: enrollments.length, averageCompletion, completedStudents: studentReports.filter((item) => item.progressPercent === 100).length, totalComments, totalNotes, totalChatMessages, studentReports } });
}));
app.get("/api/admin/traffic", ...adminOnly, asyncHandler((req, res) => list(req, res, TrafficLog, {}, { sort: { createdAt: -1 } })));
app.get(
  "/api/admin/roles",
  ...adminOnly,
  (req, res) =>
    res.json({
      success: true,
      roles: ["main_admin", "teacher", "student", "devotee", "user"],
      permissions: [
        "canCreateCourse",
        "canEditCourse",
        "canDeleteCourse",
        "canCreateLesson",
        "canEditLesson",
        "canCreateBlog",
        "canCreateVideoBlog",
        "canViewStudents",
        "canViewAnalytics"
      ]
    })
);
app.get("/api/admin/footer", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, footer: await FooterSetting.findOne({ singletonKey: "footer" }).lean() })));
app.put("/api/admin/footer", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, footer: await FooterSetting.findOneAndUpdate({ singletonKey: "footer" }, { ...req.body, singletonKey: "footer" }, { new: true, upsert: true }) })));
app.get("/api/admin/site-settings", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, settings: await SiteSetting.findOne({ singletonKey: "site" }).lean() })));
app.put("/api/admin/site-settings", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, settings: await SiteSetting.findOneAndUpdate({ singletonKey: "site" }, { ...req.body, singletonKey: "site" }, { new: true, upsert: true }) })));
app.put("/api/admin/legal/:slug", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, item: await LegalPage.findOneAndUpdate({ slug: req.params.slug }, { ...req.body, slug: req.params.slug }, { new: true, upsert: true }) })));
app.put("/api/admin/contact-messages/:id/read", ...adminOnly, asyncHandler(async (req, res) => res.json({ success: true, item: await ContactMessage.findByIdAndUpdate(req.params.id, { status: "read" }, { new: true }) })));

const aliases = { visionaries: "preachers", "media/images": "gallery-images", "media/videos": "gallery-videos", "gallery/images": "gallery-images", "gallery/videos": "gallery-videos", "home-sections": "home-sections", "video-intro": "home-sections" };
const fields = {
  "about-sections": ["sectionTitle", "sectionSubtitle", "description"],
  users: ["name", "email", "phone", "role"],
  courses: ["title", "category", "shortDescription"],
  lessons: ["title", "description"],
  preachers: ["name", "designation"],
  blogs: ["title", "category", "shortDescription"],
  "video-blogs": ["title", "category", "shortDescription", "speaker"],
  subscribers: ["email"],
  "contact-messages": ["name", "email", "subject", "message"],
  "course-requests": ["fullName", "email", "phone"],
  pilgrimages: ["title", "route", "shortDescription"],
  "booking-taxes": ["label", "note"],
  "pilgrimage-bookings": ["bookingRef", "fullName", "email", "phone"]
};
const adminResource = (resource) => {
  const name = aliases[resource] || resource;
  const Model = modelRegistry[name];
  if (!Model) throw Object.assign(new Error(`Unknown resource: ${resource}`), { statusCode: 404 });
  return { name, Model };
};
const adminFilter = (req, name, resource) => {
  const filter = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.role && req.query.role !== "all") filter.role = req.query.role;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.pageName) filter.pageName = req.query.pageName;
  if (req.query.questionBank) filter.questionBank = req.query.questionBank;
  if (resource === "video-intro") filter.sectionKey = "video_intro";
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = (fields[name] || ["title", "name", "slug"]).map((field) => ({ [field]: regex }));
  }
  return filter;
};
const prepareAdminBody = (name, body, userId) => {
  if (name === "banners") return prepareBannerBody(body);
  if (name === "courses") return prepareCourseBody(body, userId, !body._id);
  if (name === "lessons") return prepareLessonBody(body, null, userId, !body._id);
  const data = { ...body };
  if (["courses", "blogs", "video-blogs", "upcoming-classes", "pages", "legal-pages", "pilgrimages"].includes(name) && !data.slug) data.slug = slugify(data.title);
  if (name === "preachers" && !data.slug) data.slug = slugify(data.name);
  if (name === "lessons" && !data.slug) data.slug = slugify(data.title);
  if (name === "home-sections") data.pageName = data.pageName || "home";
  if (name === "courses" && !data.createdBy) data.createdBy = userId;
  if (name === "lessons" && !data.createdBy) data.createdBy = userId;
  if (name === "users" && !data.password) delete data.password;
  return data;
};
// moved dynamic CRUD routes to the bottom

// ==========================================
// CHAT & 1-TO-1 CONVERSATION SYSTEM API
// ==========================================

// Get or create 1-to-1 support conversation for student + course
app.post("/api/chats/conversation/get-or-create", protect, asyncHandler(async (req, res) => {
  const { courseId, studentId } = req.body;
  const targetStudentId = studentId || req.user._id;

  /* No courseId means a general support conversation, opened from the site
     by any signed-in user rather than from inside a course. */
  const isGeneral = !courseId;

  if (!isGeneral) {
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
  }

  const admin = await User.findOne({ role: "main_admin" }).lean();
  if (!admin) return res.status(404).json({ success: false, message: "No admin found" });

  let room = await ChatRoom.findOne({
    course: isGeneral ? null : courseId,
    participants: targetStudentId
  });

  if (!room) {
    room = await ChatRoom.create({
      course: isGeneral ? null : courseId,
      participants: [targetStudentId, admin._id],
      lastMessage: "Conversation started",
      lastMessageAt: new Date(),
      unreadCounts: { [targetStudentId.toString()]: 0, [admin._id.toString()]: 0 }
    });
  }

  const populatedRoom = await ChatRoom.findById(room._id)
    .populate("participants", "name email role profileImage isOnline lastSeen")
    .populate("course", "title slug")
    .lean();

  res.json({ success: true, room: populatedRoom });
}));

// List user's conversations
app.get("/api/chats", protect, asyncHandler(async (req, res) => {
  const filter = { participants: req.user._id };
  const rooms = await ChatRoom.find(filter)
    .populate("participants", "name email role profileImage isOnline lastSeen")
    .populate("course", "title slug")
    .sort({ lastMessageAt: -1 })
    .lean();

  res.json({ success: true, items: rooms });
}));

// List messages in a conversation room
app.get("/api/chats/:conversationId/messages", protect, asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.conversationId).lean();
  if (!room) return res.status(404).json({ success: false, message: "Conversation not found" });

  // Mark messages from other user as read
  await ChatMessage.updateMany(
    { room: room._id, sender: { $ne: req.user._id }, status: { $ne: "read" } },
    { status: "read", readAt: new Date() }
  );

  // Clear unread count for current user
  const key = `unreadCounts.${req.user._id}`;
  await ChatRoom.findByIdAndUpdate(room._id, { $set: { [key]: 0 } });

  // Notify sender via socket that messages are read
  const otherUser = room.participants.find(p => p.toString() !== req.user._id.toString());
  if (otherUser) {
    emitToUser(otherUser, "messages_read", { conversationId: room._id, readerId: req.user._id });
  }

  const messages = await ChatMessage.find({ room: room._id })
    .populate("sender", "name role profileImage")
    .populate("receiver", "name role profileImage")
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, items: messages });
}));

// Send a direct 1-to-1 support message
app.post("/api/chats/send-message", protect, asyncHandler(async (req, res) => {
  const { conversationId, courseId, text, fileUrl, fileType, fileName } = req.body;
  const room = await ChatRoom.findById(conversationId);
  if (!room) return res.status(404).json({ success: false, message: "Conversation not found" });

  const receiverId = room.participants.find(p => p.toString() !== req.user._id.toString());
  if (!receiverId) return res.status(400).json({ success: false, message: "No recipient in conversation" });

  const message = await ChatMessage.create({
    room: room._id,
    course: courseId || room.course,
    sender: req.user._id,
    receiver: receiverId,
    text,
    fileUrl,
    fileType,
    fileName,
    messageType: fileUrl ? "file" : "text",
    status: "sent",
    senderRole: req.user.role === "main_admin" ? "admin" : req.user.role
  });

  // Update conversation logs & increment unread map
  const key = `unreadCounts.${receiverId}`;
  const updatedRoom = await ChatRoom.findByIdAndUpdate(
    room._id,
    {
      $set: { lastMessage: text || `Sent an attachment: ${fileName || "file"}` },
      $currentDate: { lastMessageAt: true },
      $inc: { [key]: 1 }
    },
    { new: true }
  );

  const populatedMessage = await ChatMessage.findById(message._id)
    .populate("sender", "name role profileImage")
    .populate("receiver", "name role profileImage")
    .lean();

  // Send real-time socket event
  emitToUser(receiverId, "receive_message", {
    message: populatedMessage,
    room: updatedRoom
  });

  // Create in-app notification for receiver
  try {
    const receiver = await User.findById(receiverId).select("role").lean();
    let notificationLink = "/student/chat";
    if (receiver?.role === "main_admin") {
      notificationLink = "/admin/chat";
    } else if (receiver?.role === "teacher") {
      notificationLink = "/teacher/chat";
    }

    await createNotification({
      user: receiverId,
      audience: "user",
      type: "chat",
      title: `New message from ${req.user.name}`,
      message: text || "Sent an attachment",
      link: notificationLink
    });
    
    emitToUser(receiverId, "new_notification", {
      title: `New message from ${req.user.name}`,
      message: text || "Sent an attachment"
    });
  } catch (err) {
    console.error("Error creating chat notification:", err);
  }

  let updatedRoomFinal = updatedRoom;
  if ((!room.assignedToType || room.assignedToType === "bot") && req.user.role === "student") {
    let replyText = "";
    const lowText = (text || "").toLowerCase();
    if (lowText.includes("doubt") || lowText.includes("lesson") || lowText.includes("yoga") || lowText.includes("gita")) {
      replyText = "Hare Krishna! If you have a lesson-specific query, please use the lesson comment box or choose the 'Chat with Preacher' option to get personalized support!";
    } else if (lowText.includes("access") || lowText.includes("lock") || lowText.includes("document") || lowText.includes("approve")) {
      replyText = "Hare Krishna! For approvals, upload your required devotee recommendation letter. If you have questions, please choose the 'Admin Support' option to connect with our support desk.";
    } else if (lowText.includes("complete") || lowText.includes("finish") || lowText.includes("certificate")) {
      replyText = "To finish your course, watch all lesson videos to the end, mark them complete, and submit all quiz assessments!";
    } else {
      replyText = "Hare Krishna! I am your course chatbot. If my options can't help, click the options below to chat directly with either Course Preacher or Admin Support!";
    }

    const botMsg = await ChatMessage.create({
      room: room._id,
      course: courseId || room.course,
      sender: req.user._id,
      text: replyText,
      messageType: "bot",
      senderRole: "bot",
      isBotMessage: true
    });

    const updatedSummary = (room.botSummary || "") + `\nStudent: ${text}\nBot: ${replyText}`;
    updatedRoomFinal = await ChatRoom.findByIdAndUpdate(
      room._id,
      {
        $set: { lastMessage: replyText, botSummary: updatedSummary, lastReplyBy: "bot", assignedToType: "bot" },
        $currentDate: { lastMessageAt: true }
      },
      { new: true }
    );

    const populatedBotMessage = await ChatMessage.findById(botMsg._id)
      .populate("sender", "name role profileImage")
      .lean();

    emitToUser(req.user._id, "receive_message", {
      message: populatedBotMessage,
      room: updatedRoomFinal
    });
  }

  res.status(201).json({ success: true, item: populatedMessage, room: updatedRoomFinal });
}));

// Start/send a direct personal message from admin or teacher to a student
app.post("/api/chats/personal-message", protect, asyncHandler(async (req, res) => {
  if (req.user.role !== "main_admin" && req.user.role !== "teacher") {
    return res.status(403).json({ success: false, message: "Unauthorized - Only admins and teachers can send direct personal messages" });
  }

  let { courseId, studentId, messageText } = req.body;
  if (!studentId || !messageText) {
    return res.status(400).json({ success: false, message: "studentId and messageText are required" });
  }

  const student = await User.findById(studentId).lean();
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  let targetCourseId = courseId;
  if (!targetCourseId) {
    // Try to find a course the student is enrolled in
    const enrollment = await Enrollment.findOne({ student: studentId }).lean();
    if (enrollment) {
      targetCourseId = enrollment.course;
    } else {
      // Fallback to the first available course in the database
      const anyCourse = await Course.findOne().lean();
      if (anyCourse) {
        targetCourseId = anyCourse._id;
      }
    }
  }

  if (!targetCourseId) {
    return res.status(400).json({ success: false, message: "At least one course must exist in the database to start a support chat" });
  }

  const course = await Course.findById(targetCourseId).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  // Find or create chat room for this student and course
  let room = await ChatRoom.findOne({
    course: targetCourseId,
    participants: studentId
  });

  const isTeacher = req.user.role === "teacher";
  const participants = [studentId, req.user._id];

  if (!room) {
    room = await ChatRoom.create({
      course: targetCourseId,
      participants,
      assignedToType: isTeacher ? "teacher" : "admin",
      assignedTeacherId: isTeacher ? req.user._id : null,
      lastMessage: messageText,
      lastMessageAt: new Date(),
      unreadCounts: { [studentId.toString()]: 1, [req.user._id.toString()]: 0 }
    });
  } else {
    // Update existing room to assign to this sender and ensure they are participants
    const unreadKey = `unreadCounts.${studentId}`;
    room = await ChatRoom.findByIdAndUpdate(
      room._id,
      {
        $set: {
          assignedToType: isTeacher ? "teacher" : "admin",
          assignedTeacherId: isTeacher ? req.user._id : null,
          participants,
          lastMessage: messageText
        },
        $currentDate: { lastMessageAt: true },
        $inc: { [unreadKey]: 1 }
      },
      { new: true }
    );
  }

  // Create the ChatMessage
  const message = await ChatMessage.create({
    room: room._id,
    course: targetCourseId,
    sender: req.user._id,
    receiver: studentId,
    text: messageText,
    messageType: "text",
    status: "sent",
    senderRole: req.user.role === "main_admin" ? "admin" : req.user.role
  });

  const populatedMessage = await ChatMessage.findById(message._id)
    .populate("sender", "name role profileImage")
    .populate("receiver", "name role profileImage")
    .lean();

  const populatedRoom = await ChatRoom.findById(room._id)
    .populate("participants", "name email role profileImage isOnline lastSeen")
    .populate("course", "title slug")
    .lean();

  // Send real-time socket message event to the student
  emitToUser(studentId, "receive_message", {
    message: populatedMessage,
    room: populatedRoom
  });

  // Create in-app Notification for the student
  await createNotification({
    user: studentId,
    audience: "user",
    type: "chat",
    title: `New message from ${req.user.name}`,
    message: messageText,
    link: "/student/chat"
  });

  // Send real-time socket notification update to the student
  emitToUser(studentId, "new_notification", {
    title: `New message from ${req.user.name}`,
    message: messageText
  });

  res.status(201).json({ success: true, item: populatedMessage, room: populatedRoom });
}));

app.delete("/api/chats/message/:messageId", protect, asyncHandler(async (req, res) => {
  const message = await ChatMessage.findOneAndDelete({ _id: req.params.messageId, sender: req.user._id });
  if (!message) return res.status(404).json({ success: false, message: "Message not found" });
  res.json({ success: true, message: "Message deleted" });
}));


// ==========================================
// DOUBT COMMENTS & THREADED DISCUSSIONS API
// ==========================================

// Fetch lesson comments / doubts organizes by page
app.get("/api/comments/course/:courseId", protect, asyncHandler(async (req, res) => {
  const filter = { course: req.params.courseId, parentComment: null };
  if (req.query.lessonId) filter.lesson = req.query.lessonId;
  
  const comments = await Comment.find(filter)
    .populate("user", "name role profileImage")
    .populate("adminReplyUser", "name role profileImage")
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  const itemsWithReplies = await Promise.all(
    comments.map(async (c) => {
      const replies = await Comment.find({ parentComment: c._id })
        .populate("user", "name role profileImage")
        .sort({ createdAt: 1 })
        .lean();
      return { ...c, replies };
    })
  );

  res.json({ success: true, items: itemsWithReplies });
}));

// Admin central doubts management list with filters
app.get("/api/comments/admin/board", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.priority && req.query.priority !== "all") filter.priority = req.query.priority;
  if (req.query.courseId) filter.course = req.query.courseId;
  
  if (req.query.isResolved === "true") {
    filter.status = "resolved";
  } else if (req.query.isResolved === "false") {
    filter.status = { $ne: "resolved" };
  }

  if (req.query.hasAttachment === "true") {
    filter.fileUrl = { $exists: true, $ne: null };
  }

  if (req.query.search) {
    const userMatches = await User.find({ name: new RegExp(req.query.search, "i") }).select("_id");
    filter.$or = [
      { text: new RegExp(req.query.search, "i") },
      { user: { $in: userMatches.map(u => u._id) } }
    ];
  }

  const items = await Comment.find(filter)
    .populate("user", "name email role profileImage")
    .populate("course", "title slug")
    .populate("lesson", "title slug")
    .populate("adminReplyUser", "name role profileImage")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, items });
}));

// Submit student doubt, with optional attachment (PDF/image) fields
app.post("/api/comments", protect, asyncHandler(async (req, res) => {
  if (req.user.status !== "active") return res.status(403).json({ success: false, message: "Blocked users cannot comment" });
  const { courseId, lessonId, text, fileUrl, fileName, priority, parentComment } = req.body;

  if (String(text || "").trim().length < 2) {
    return res.status(400).json({ success: false, message: "Comment is too short" });
  }

  const comment = await Comment.create({
    user: req.user._id,
    course: courseId,
    lesson: lessonId,
    parentComment: parentComment || null,
    text,
    fileUrl,
    fileName,
    priority: priority || "medium",
    status: "pending"
  });

  // Alert all admin profiles in DB via sound triggers
  const admins = await User.find({ role: "main_admin" }).lean();
  for (const admin of admins) {
    await Notification.create({
      user: admin._id,
      audience: "admin",
      type: "comment",
      title: "New Student Doubt Posted",
      message: `${req.user.name} asked a question: "${text.substring(0, 50)}..."`,
      link: "/admin/comments"
    });
    emitToUser(admin._id, "new_notification", { title: "New doubt posted!" });
  }

  res.status(201).json({ success: true, item: await comment.populate("user", "name role profileImage") });
}));

// Admin/preacher replies to a doubt
app.post("/api/comments/:commentId/reply", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const { replyText } = req.body;
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Doubt comment not found" });

  comment.adminReply = replyText;
  comment.adminReplyUser = req.user._id;
  comment.adminReplyAt = new Date();
  comment.status = "replied";
  await comment.save();

  // Create devotee alarm notification alert
  await Notification.create({
    user: comment.user,
    audience: "user",
    type: "reply",
    title: "Teacher Replied to your Doubt 📝",
    message: `${req.user.name} answered your doubt in class.`,
    link: `/courses/${comment.course}`
  });
  emitToUser(comment.user, "new_notification", { title: "Teacher replied to your doubt!" });

  res.json({ success: true, item: await comment.populate("adminReplyUser", "name role profileImage") });
}));

// Resolve doubt comment
app.patch("/api/comments/:commentId/resolve", protect, asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
  
  comment.status = comment.status === "resolved" ? "replied" : "resolved";
  await comment.save();
  res.json({ success: true, item: comment });
}));

// Adjust doubt comment priority level
app.patch("/api/comments/:commentId/priority", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const { priority } = req.body;
  const comment = await Comment.findByIdAndUpdate(req.params.commentId, { priority }, { new: true });
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
  res.json({ success: true, item: comment });
}));

// Toggle pin status
app.patch("/api/comments/:commentId/pin", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
  comment.isPinned = !comment.isPinned;
  await comment.save();
  res.json({ success: true, item: comment });
}));


// ==========================================
// NOTIFICATIONS & SYSTEM BADGES API
// ==========================================

app.get("/api/notifications", protect, asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, items });
}));

app.put("/api/notifications/:id/read", protect, asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true, readAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, item });
}));

app.patch("/api/notifications/mark-all-read", protect, asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true, readAt: new Date() });
  res.json({ success: true, message: "All notifications marked as read" });
}));

app.delete("/api/notifications/:id", protect, asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true, message: "Deleted" });
}));


// ==========================================
// STUDY ACTIVITY & DYNAMIC ANALYTICS API
// ==========================================

// Accumulate active watch minutes consistency data
app.post("/api/activity/update-watch-time", protect, asyncHandler(async (req, res) => {
  const { courseId, lessonId, watchSeconds } = req.body;
  const studentId = req.user._id;

  if (!courseId || !lessonId || !watchSeconds) {
    return res.status(400).json({ success: false, message: "Missing tracking variables" });
  }

  const minutes = Number((watchSeconds / 60).toFixed(2));
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Update devotee general UserActivity log
  const activity = await UserActivity.findOneAndUpdate(
    { user: studentId, course: courseId },
    {
      $set: { lesson: lessonId, lastActiveAt: new Date(), isOnline: true },
      $inc: { totalWatchTime: minutes }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 2. Aggregate consistency score logs in StudentAnalytics
  let analytics = await StudentAnalytics.findOne({ user: studentId, course: courseId });
  if (!analytics) {
    analytics = await StudentAnalytics.create({
      user: studentId,
      course: courseId,
      dailyWatchTimes: [],
      quizScores: [],
      assignmentScores: [],
      weeklyWatchTime: 0,
      monthlyWatchTime: 0,
      improvementScore: 50,
      engagementScore: 50
    });
  }

  const dayRecordIndex = analytics.dailyWatchTimes.findIndex(r => r.date === todayStr);
  if (dayRecordIndex >= 0) {
    analytics.dailyWatchTimes[dayRecordIndex].minutes = Number((analytics.dailyWatchTimes[dayRecordIndex].minutes + minutes).toFixed(2));
  } else {
    analytics.dailyWatchTimes.push({ date: todayStr, minutes });
  }

  // Recalculate weekly and monthly rollovers
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let weeklyTime = 0;
  let monthlyTime = 0;

  analytics.dailyWatchTimes.forEach(record => {
    const recordDate = new Date(record.date);
    if (recordDate >= sevenDaysAgo) weeklyTime += record.minutes;
    if (recordDate >= thirtyDaysAgo) monthlyTime += record.minutes;
  });

  analytics.weeklyWatchTime = Number(weeklyTime.toFixed(2));
  analytics.monthlyWatchTime = Number(monthlyTime.toFixed(2));

  // Determine active learning days out of last 7
  const activeDaysInWeek = analytics.dailyWatchTimes.filter(r => new Date(r.date) >= sevenDaysAgo && r.minutes > 0).length;
  analytics.engagementScore = Math.min(100, Math.round((activeDaysInWeek / 7) * 60 + Math.min(40, (weeklyTime / 60) * 40)));

  // Calculate course completion progress summary percentage
  const compLessonsCount = await Progress.countDocuments({ student: studentId, course: courseId });
  const totalLessons = await Lesson.countDocuments({ course: courseId });
  const progressPercent = totalLessons ? Math.round((compLessonsCount / totalLessons) * 100) : 0;

  // Weighted score totals out of 100
  const quizAvg = analytics.quizScores.length ? (analytics.quizScores.reduce((a,b)=>a+b, 0) / analytics.quizScores.length) : 80;
  analytics.improvementScore = Math.min(100, Math.round((progressPercent * 0.4) + (analytics.engagementScore * 0.3) + (quizAvg * 0.3)));

  await analytics.save();

  res.json({ success: true, activity, analytics });
}));

// Admin Analytics Dashboard datasets
app.get("/api/analytics/admin-dashboard", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const totalStudentsCount = await User.countDocuments({ role: "student" });
  const onlineCount = await User.countDocuments({ isOnline: true });
  const unresolvedDoubtsCount = await Comment.countDocuments({ status: "pending" });

  // Devotee completion percentages list
  const enrollments = await Enrollment.find().populate("student", "name email").populate("course", "title").lean();
  const progressSummaryList = await Promise.all(
    enrollments.map(async (e) => {
      if (!e.student || !e.course) return null;
      const compCount = await Progress.countDocuments({ student: e.student._id, course: e.course._id });
      const totalLess = await Lesson.countDocuments({ course: e.course._id });
      const percent = totalLess ? Math.round((compCount / totalLess) * 100) : 0;
      return {
        studentId: e.student._id,
        studentName: e.student.name,
        studentEmail: e.student.email,
        courseId: e.course._id,
        courseTitle: e.course.title,
        progress: percent
      };
    })
  );
  const filteredProgress = progressSummaryList.filter(Boolean);

  // Aggregated weekly study consistency line datasets
  const weeklyConsistencyData = [];
  const sevenDaysAgo = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(sevenDaysAgo.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    weeklyConsistencyData.push({ date: dateStr, minutes: 0 });
  }

  const analyticsRecords = await StudentAnalytics.find().lean();
  analyticsRecords.forEach((record) => {
    record.dailyWatchTimes.forEach((d) => {
      const item = weeklyConsistencyData.find((w) => w.date === d.date);
      if (item) item.minutes = Number((item.minutes + d.minutes).toFixed(2));
    });
  });

  // Roster of devotees inactive for more than 3 days
  const inactiveCutoff = new Date(); inactiveCutoff.setDate(inactiveCutoff.getDate() - 3);
  const inactiveList = await UserActivity.find({ lastActiveAt: { $lt: inactiveCutoff } })
    .populate("user", "name email phone isOnline lastSeen")
    .populate("course", "title")
    .populate("lesson", "title")
    .sort({ lastActiveAt: 1 })
    .limit(20)
    .lean();

  res.json({
    success: true,
    stats: {
      totalStudents: totalStudentsCount,
      onlineStudents: onlineCount,
      unresolvedDoubts: unresolvedDoubtsCount,
      activeChats: await ChatRoom.countDocuments()
    },
    progressDataset: filteredProgress,
    weeklyWatchTimeDataset: weeklyConsistencyData,
    inactiveStudents: inactiveList
  });
}));

// Retrieve devotee full report card metrics
app.get("/api/analytics/student/:studentId", protect, asyncHandler(async (req, res) => {
  const userId = req.params.studentId;
  const user = await User.findById(userId).select("name email profileImage adminNotes isOnline lastSeen").lean();
  if (!user) return res.status(404).json({ success: false, message: "Devotee account not found" });

  const analytics = await StudentAnalytics.find({ user: userId }).populate("course", "title").lean();
  const activities = await UserActivity.find({ user: userId }).populate("course", "title").populate("lesson", "title").lean();

  res.json({ success: true, student: user, analytics, activities });
}));

// Admin private tracking notes
app.post("/api/analytics/student/:studentId/notes", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;
  const user = await User.findByIdAndUpdate(req.params.studentId, { adminNotes }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: "Admin private note updated", adminNotes: user.adminNotes });
}));

// Trigger reminder notification
app.post("/api/analytics/remind/:studentId", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;
  const { courseId, message } = req.body;

  const remindMsg = message || "Hare Krishna! We noticed you haven't studied Gita Classes in a few days. Let's get back to learning today!";

  await Notification.create({
    user: studentId,
    audience: "user",
    type: "reminder",
    title: "Learning Reminder 📖",
    message: remindMsg,
    link: courseId ? `/courses/${courseId}` : "/student/learning"
  });
  
  emitToUser(studentId, "new_notification", { title: "New Learning Reminder!" });

  res.json({ success: true, message: "Devotee reminded successfully" });
}));

// 12-Hour automated check interval for inactive students (Rule 9)
setInterval(async () => {
  try {
    const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 3 Days Inactive
    const inactive3 = await UserActivity.find({ lastActiveAt: { $lt: threeDaysAgo, $gte: fiveDaysAgo } }).select("user course");
    for (const act of inactive3) {
      const exists = await Notification.findOne({ user: act.user, type: "reminder", createdAt: { $gte: threeDaysAgo } });
      if (!exists) {
        await Notification.create({
          user: act.user,
          audience: "user",
          type: "reminder",
          title: "Krishna is waiting for you! ✨",
          message: "It has been 3 days since your last lesson. Keep your consistency growing today!",
          link: `/courses/${act.course}`
        });
        emitToUser(act.user, "new_notification", { title: "Krishna is waiting for you!" });
      }
    }

    // 7 Days Inactive
    const inactive7 = await UserActivity.find({ lastActiveAt: { $lt: sevenDaysAgo } }).select("user course");
    for (const act of inactive7) {
      const exists = await Notification.findOne({ user: act.user, type: "reminder", createdAt: { $gte: sevenDaysAgo } });
      if (!exists) {
        await Notification.create({
          user: act.user,
          audience: "user",
          type: "reminder",
          title: "Daily study is key to progress! 📖",
          message: "Consistency score is dropping. Re-ignite your learning journey today!",
          link: `/courses/${act.course}`
        });
        emitToUser(act.user, "new_notification", { title: "Krishna is waiting for you!" });
      }
    }
  } catch (err) {
    console.error("Auto Inactivity checker error:", err.message);
  }
}, 12 * 60 * 60 * 1000); // Check every 12 hours



// ==========================================
// PREACHER/TEACHER & STUDENT TRACKING API
// ==========================================

const syncCourseTeachers = async (courseId, primaryTeacherId, supportTeacherIds) => {
  const teacherIds = [];
  if (primaryTeacherId) teacherIds.push(primaryTeacherId.toString());
  if (Array.isArray(supportTeacherIds)) {
    supportTeacherIds.forEach(id => {
      if (id && !teacherIds.includes(id.toString())) {
        teacherIds.push(id.toString());
      }
    });
  }
  await User.updateMany(
    { assignedCourses: courseId, _id: { $nin: teacherIds } },
    { $pull: { assignedCourses: courseId } }
  );
  if (teacherIds.length > 0) {
    await User.updateMany(
      { _id: { $in: teacherIds } },
      { $addToSet: { assignedCourses: courseId } }
    );
  }
};

const emitToRole = async (roleName, eventName, data) => {
  const users = await User.find({ role: roleName }).select("_id").lean();
  users.forEach((u) => {
    emitToUser(u._id, eventName, data);
  });
};

// 1. TEACHER APIS
app.get("/api/teacher/dashboard", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const assignedCourseIds = req.user.assignedCourses || [];

  const totalCourses = assignedCourseIds.length;
  const totalStudents = await Enrollment.countDocuments({ course: { $in: assignedCourseIds } });
  
  const pendingChats = await ChatRoom.countDocuments({
    course: { $in: assignedCourseIds },
    assignedToType: "teacher",
    assignedTeacherId: teacherId,
    status: { $in: ["open", "pending"] }
  });

  const pendingComments = await Comment.countDocuments({
    course: { $in: assignedCourseIds },
    assignedToType: "teacher",
    assignedTeacherId: teacherId,
    status: "pending"
  });

  // Calculate average reply time and student rating
  const analytics = await TeacherAnalytics.findOne({ teacher: teacherId }) || {
    averageReplyTime: 12,
    studentRating: 4.8
  };

  res.json({
    success: true,
    stats: {
      totalCourses,
      totalStudents,
      pendingChats,
      pendingComments,
      averageReplyTime: analytics.averageReplyTime,
      studentRating: analytics.studentRating
    }
  });
}));

app.get("/api/teacher/assigned-courses", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const assignedCourseIds = req.user.assignedCourses || [];
  const courses = await Course.find({ _id: { $in: assignedCourseIds } }).lean();
  res.json({ success: true, items: courses });
}));

app.get("/api/teacher/course/:courseId/students", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  if (!req.user.assignedCourses?.includes(courseId)) {
    return res.status(403).json({ success: false, message: "Forbidden - Course not assigned" });
  }

  const enrollments = await Enrollment.find({ course: courseId })
    .populate("student", "name email mobile profileImage isOnline lastSeen")
    .lean();

  const students = await Promise.all(enrollments.map(async (e) => {
    const act = await UserActivity.findOne({ user: e.student?._id, course: courseId }).lean();
    return {
      ...e.student,
      progress: e.progress || 0,
      enrolledAt: e.enrolledAt,
      lastActive: act ? act.lastActiveAt : null,
      currentLesson: act ? act.lesson : null
    };
  }));

  res.json({ success: true, items: students });
}));

app.get("/api/teacher/chats", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({
    course: { $in: req.user.assignedCourses || [] },
    assignedToType: "teacher",
    assignedTeacherId: req.user._id
  })
    .populate("participants", "name email role profileImage isOnline lastSeen")
    .populate("course", "title slug")
    .sort({ lastMessageAt: -1 })
    .lean();

  res.json({ success: true, items: rooms });
}));

app.get("/api/teacher/comments", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const comments = await Comment.find({
    course: { $in: req.user.assignedCourses || [] },
    assignedToType: "teacher",
    assignedTeacherId: req.user._id
  })
    .populate("user", "name email profileImage")
    .populate("course", "title slug")
    .populate("lesson", "title")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, items: comments });
}));

app.post("/api/teacher/comments/:commentId/reply", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const { replyText } = req.body;
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Doubt comment not found" });

  comment.adminReply = replyText;
  comment.adminReplyUser = req.user._id;
  comment.adminReplyAt = new Date();
  comment.status = "replied";
  comment.repliedById = req.user._id;
  comment.repliedByRole = "teacher";
  await comment.save();

  // Increment Preacher Analytics
  await TeacherAnalytics.findOneAndUpdate(
    { teacher: req.user._id, course: comment.course },
    { $inc: { totalCommentsReplied: 1, resolvedCount: 1 } },
    { upsert: true, new: true }
  );

  // Send Notification to devotee student
  await Notification.create({
    user: comment.user,
    audience: "user",
    type: "info",
    title: "Doubt Resolved ✨",
    message: `Preacher ${req.user.name} replied: "${replyText.slice(0, 40)}..."`,
    link: `/courses/${comment.course}`
  });
  emitToUser(comment.user, "new_notification", { title: "Preacher resolved your doubt!" });

  res.json({ success: true, item: comment });
}));

app.post("/api/teacher/chats/:conversationId/reply", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const { text, fileUrl, fileType, fileName } = req.body;
  const room = await ChatRoom.findById(req.params.conversationId);
  if (!room) return res.status(404).json({ success: false, message: "Chat not found" });

  const receiverId = room.participants.find(p => p.toString() !== req.user._id.toString());
  
  const message = await ChatMessage.create({
    room: room._id,
    course: room.course,
    sender: req.user._id,
    receiver: receiverId || req.user._id,
    text,
    fileUrl,
    fileType,
    fileName,
    messageType: fileUrl ? "file" : "text",
    senderRole: "teacher"
  });

  const key = `unreadCounts.${receiverId}`;
  const updatedRoom = await ChatRoom.findByIdAndUpdate(
    room._id,
    {
      $set: { lastMessage: text || `Sent an attachment: ${fileName || "file"}`, lastReplyBy: "teacher", status: "pending" },
      $currentDate: { lastMessageAt: true },
      $inc: { [key]: 1 }
    },
    { new: true }
  );

  // Increment Preacher Analytics
  await TeacherAnalytics.findOneAndUpdate(
    { teacher: req.user._id, course: room.course },
    { $inc: { totalChatsHandled: 1 } },
    { upsert: true }
  );

  const populated = await ChatMessage.findById(message._id).populate("sender", "name role profileImage").lean();
  emitToUser(receiverId, "receive_message", { message: populated, room: updatedRoom });

  // Create in-app notification for student receiver
  try {
    await createNotification({
      user: receiverId,
      audience: "user",
      type: "chat",
      title: `New message from Preacher ${req.user.name}`,
      message: text || "Sent an attachment",
      link: "/student/chat"
    });
    
    emitToUser(receiverId, "new_notification", {
      title: `New message from Preacher ${req.user.name}`,
      message: text || "Sent an attachment"
    });
  } catch (err) {
    console.error("Error creating chat notification:", err);
  }

  res.json({ success: true, item: populated, room: updatedRoom });
}));

app.post("/api/teacher/escalate/:conversationId", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const room = await ChatRoom.findById(req.params.conversationId);
  if (!room) return res.status(404).json({ success: false, message: "Chat not found" });

  room.assignedToType = "admin";
  room.status = "escalated";
  room.lastMessage = `Escalated by preacher: ${reason}`;
  await room.save();

  // Create System Message
  const systemMsg = await ChatMessage.create({
    room: room._id,
    course: room.course,
    sender: req.user._id,
    text: `System: Preacher ${req.user.name} escalated this conversation to Admin. Reason: ${reason || "Access/Payment problem"}`,
    messageType: "system",
    senderRole: "system"
  });

  // Notify active admins
  emitToRole("main_admin", "chat_escalated", { room });

  const admin = await User.findOne({ role: "main_admin" }).lean();
  if (admin) {
    await Notification.create({
      user: admin._id,
      audience: "admin",
      type: "warning",
      title: "Chat Escalation",
      message: `Preacher ${req.user.name} escalated chat room. Reason: ${reason}`,
      link: `/admin/chat?roomId=${room._id}`
    });
    emitToUser(admin._id, "new_notification", { title: "Doubt escalated to admin" });
  }

  res.json({ success: true, room });
}));

app.get("/api/teacher/analytics", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const stats = await TeacherAnalytics.find({ teacher: req.user._id }).populate("course", "title").lean();
  res.json({ success: true, items: stats });
}));

// 2. ADMIN TEACHER MANAGEMENT & PROGRESS APIS

// GET Assignable Courses
app.get("/api/admin/courses/assignable", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const courses = await Course.find({}).lean();
  const assignable = await Promise.all(courses.map(async (c) => {
    const enrolledCount = await Enrollment.countDocuments({ course: c._id });
    const primaryTeacher = c.primaryTeacherId ? await User.findById(c.primaryTeacherId).select("name email").lean() : null;
    return {
      _id: c._id,
      title: c.title,
      category: c.category,
      isActive: c.isActive,
      status: c.status,
      enrolledCount,
      primaryTeacher
    };
  }));
  res.json({ success: true, items: assignable });
}));

// GET List of Teachers
app.get("/api/admin/teachers", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "teacher" })
    .select("name email phone mobile status assignedCourses teacherType specialization permissions isOnline lastSeen bio createdAt")
    .lean();

  const items = await Promise.all(teachers.map(async (t) => {
    const totalStudents = await Enrollment.countDocuments({ course: { $in: t.assignedCourses || [] } });
    const pendingComments = await Comment.countDocuments({
      course: { $in: t.assignedCourses || [] },
      status: "pending"
    });
    const unreadChats = await ChatRoom.countDocuments({
      course: { $in: t.assignedCourses || [] },
      status: { $in: ["open", "pending"] },
      assignedTeacherId: t._id
    });

    const ratingDoc = await TeacherRating.aggregate([
      { $match: { teacher: t._id } },
      { $group: { _id: "$teacher", avgRating: { $avg: "$rating" } } }
    ]);
    const rating = ratingDoc.length > 0 ? Number(ratingDoc[0].avgRating.toFixed(1)) : 5.0;

    const performance = await TeacherPerformance.findOne({ teacher: t._id }).lean();
    const avgReplyTime = performance ? performance.averageReplyTime : 12;

    return {
      ...t,
      totalStudents,
      pendingComments,
      unreadChats,
      rating,
      avgReplyTime
    };
  }));

  res.json({ success: true, items });
}));

// POST Create Preacher / Teacher
app.post("/api/admin/teachers", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { name, email, phone, mobile, password, profileImage, bio, specialization, assignedCourses, teacherType, permissions, status } = req.body;
  
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: "Email already registered" });

  const teacher = await User.create({
    name,
    email,
    phone: phone || mobile,
    mobile: mobile || phone,
    password,
    role: "teacher",
    profileImage,
    bio,
    specialization: Array.isArray(specialization) ? specialization : (specialization ? specialization.split(",").map(s => s.trim()) : []),
    assignedCourses: assignedCourses || [],
    teacherType: teacherType || "primary",
    permissions: permissions || {},
    status: status || "active",
    createdByAdminId: req.user._id,
    emailVerified: true
  });

  // Assign course authorities
  if (assignedCourses && assignedCourses.length > 0) {
    for (const courseId of assignedCourses) {
      const course = await Course.findById(courseId);
      if (course) {
        let oldPrimary = course.primaryTeacherId;
        if (teacherType === "primary") {
          course.primaryTeacherId = teacher._id;
          if (oldPrimary && oldPrimary.toString() !== teacher._id.toString()) {
            await TeacherAssignmentHistory.create({
              course: course._id,
              oldTeacherIds: [oldPrimary],
              newTeacherIds: [teacher._id],
              changedByAdmin: req.user._id,
              reason: "Admin initial teacher registration override"
            });
          }
        } else {
          if (!course.supportTeacherIds.includes(teacher._id)) {
            course.supportTeacherIds.push(teacher._id);
          }
        }
        if (!course.assignedTeacherIds.includes(teacher._id)) {
          course.assignedTeacherIds.push(teacher._id);
        }
        await course.save();
      }
    }
  }

  res.status(201).json({ success: true, item: teacher });
}));

// PATCH Update Preacher / Teacher
app.patch("/api/admin/teachers/:teacherId", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { name, email, phone, mobile, profileImage, bio, specialization, assignedCourses, teacherType, permissions, status } = req.body;
  const teacher = await User.findById(req.params.teacherId);
  if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

  if (name) teacher.name = name;
  if (email) teacher.email = email;
  if (phone) teacher.phone = phone;
  if (mobile) teacher.mobile = mobile;
  if (profileImage) teacher.profileImage = profileImage;
  if (bio) teacher.bio = bio;
  if (status) teacher.status = status;
  if (teacherType) teacher.teacherType = teacherType;
  if (permissions) teacher.permissions = { ...teacher.permissions, ...permissions };
  if (specialization) {
    teacher.specialization = Array.isArray(specialization) ? specialization : specialization.split(",").map(s => s.trim());
  }

  if (assignedCourses) {
    const oldCourses = teacher.assignedCourses || [];
    teacher.assignedCourses = assignedCourses;

    // Track reassignment history
    const removedCourses = oldCourses.filter(c => !assignedCourses.includes(c.toString()));
    const addedCourses = assignedCourses.filter(c => !oldCourses.includes(c.toString()));

    for (const cid of removedCourses) {
      const c = await Course.findById(cid);
      if (c) {
        if (c.primaryTeacherId && c.primaryTeacherId.toString() === teacher._id.toString()) {
          c.primaryTeacherId = null;
        }
        c.supportTeacherIds = c.supportTeacherIds.filter(id => id.toString() !== teacher._id.toString());
        c.assignedTeacherIds = c.assignedTeacherIds.filter(id => id.toString() !== teacher._id.toString());
        await c.save();

        await TeacherAssignmentHistory.create({
          course: c._id,
          oldTeacherIds: [teacher._id],
          newTeacherIds: [],
          changedByAdmin: req.user._id,
          reason: "Teacher unassigned during batch profile update"
        });
      }
    }

    for (const cid of addedCourses) {
      const c = await Course.findById(cid);
      if (c) {
        if (teacherType === "primary") {
          let oldPrimary = c.primaryTeacherId;
          c.primaryTeacherId = teacher._id;
          await TeacherAssignmentHistory.create({
            course: c._id,
            oldTeacherIds: oldPrimary ? [oldPrimary] : [],
            newTeacherIds: [teacher._id],
            changedByAdmin: req.user._id,
            reason: "Batch assignment as Primary Preacher"
          });
        } else {
          if (!c.supportTeacherIds.includes(teacher._id)) {
            c.supportTeacherIds.push(teacher._id);
          }
        }
        if (!c.assignedTeacherIds.includes(teacher._id)) {
          c.assignedTeacherIds.push(teacher._id);
        }
        await c.save();
      }
    }
  }

  await teacher.save();
  res.json({ success: true, item: teacher });
}));

// DELETE Preacher / Teacher
app.delete("/api/admin/teachers/:teacherId", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.teacherId);
  await Course.updateMany(
    { primaryTeacherId: req.params.teacherId },
    { $set: { primaryTeacherId: null }, $pull: { assignedTeacherIds: req.params.teacherId } }
  );
  await Course.updateMany(
    { supportTeacherIds: req.params.teacherId },
    { $pull: { supportTeacherIds: req.params.teacherId, assignedTeacherIds: req.params.teacherId } }
  );
  res.json({ success: true, message: "Teacher account deleted successfully" });
}));

// POST Assign teacher / course reassignments explicitly
app.post("/api/admin/courses/:courseId/assign-teacher", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { primaryTeacherId, supportTeacherIds, reason } = req.body;
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  const oldPrimary = course.primaryTeacherId;
  const oldSupports = course.supportTeacherIds || [];

  course.primaryTeacherId = primaryTeacherId || null;
  course.supportTeacherIds = supportTeacherIds || [];

  const allAssigned = [];
  if (primaryTeacherId) allAssigned.push(primaryTeacherId);
  if (Array.isArray(supportTeacherIds)) {
    supportTeacherIds.forEach(id => {
      if (!allAssigned.includes(id)) allAssigned.push(id);
    });
  }
  course.assignedTeacherIds = allAssigned;
  await course.save();

  // Audit Log
  await TeacherAssignmentHistory.create({
    course: course._id,
    oldTeacherIds: oldPrimary ? [oldPrimary] : oldSupports,
    newTeacherIds: allAssigned,
    changedByAdmin: req.user._id,
    reason: reason || "Explicit Course assignment update"
  });

  // Sync users assigned courses array
  await syncCourseTeachers(course._id, primaryTeacherId, supportTeacherIds);

  res.json({ success: true, item: course });
}));

// GET Teacher Assignment Audit History
app.get("/api/admin/courses/:courseId/teacher-history", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const history = await TeacherAssignmentHistory.find({ course: req.params.courseId })
    .populate("oldTeacherIds", "name email")
    .populate("newTeacherIds", "name email")
    .populate("changedByAdmin", "name email")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, items: history });
}));

// PATCH Block Teacher
app.patch("/api/admin/teachers/:teacherId/block", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const teacher = await User.findByIdAndUpdate(
    req.params.teacherId,
    { status: "blocked", blockedAt: new Date(), blockedReason: reason || "Blocked by admin action" },
    { new: true }
  );
  res.json({ success: true, item: teacher });
}));

// PATCH Unblock Teacher
app.patch("/api/admin/teachers/:teacherId/unblock", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const teacher = await User.findByIdAndUpdate(
    req.params.teacherId,
    { status: "active", $unset: { blockedAt: 1, blockedReason: 1 } },
    { new: true }
  );
  res.json({ success: true, item: teacher });
}));

// PATCH Reset Password
app.patch("/api/admin/teachers/:teacherId/reset-password", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  
  const teacher = await User.findById(req.params.teacherId);
  if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

  teacher.password = password;
  await teacher.save();
  res.json({ success: true, message: "Password reset successfully" });
}));

// GET Preacher Performance Report
app.get("/api/admin/teacher-performance/:teacherId", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const teacherId = req.params.teacherId;
  const teacher = await User.findById(teacherId).select("name email specialization teacherType").lean();
  if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

  const analytics = await TeacherAnalytics.find({ teacher: teacherId }).populate("course", "title").lean();
  const ratings = await TeacherRating.find({ teacher: teacherId }).populate("student", "name").populate("course", "title").lean();

  const totalReplied = analytics.reduce((acc, a) => acc + (a.totalCommentsReplied || 0), 0);
  const totalChats = analytics.reduce((acc, a) => acc + (a.totalChatsHandled || 0), 0);
  
  const avgRating = ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length : 5.0;
  const helpfulCount = ratings.filter(r => r.helpful).length;
  const helpfulPercent = ratings.length > 0 ? Math.round((helpfulCount / ratings.length) * 100) : 100;

  // Grade Calculation
  let grade = "Excellent";
  if (avgRating < 3.5 || helpfulPercent < 60) grade = "Needs Improvement";
  else if (avgRating < 4.0 || helpfulPercent < 75) grade = "Average";
  else if (avgRating < 4.5 || helpfulPercent < 90) grade = "Good";

  res.json({
    success: true,
    teacher,
    performance: {
      totalCommentsReplied: totalReplied,
      totalChatsHandled: totalChats,
      averageRating: Number(avgRating.toFixed(1)),
      helpfulReplyPercentage: helpfulPercent,
      grade
    },
    ratings,
    analytics
  });
}));

// GET Student Rating list
app.get("/api/student/teachers/:teacherId/ratings", protect, asyncHandler(async (req, res) => {
  const ratings = await TeacherRating.find({ teacher: req.params.teacherId })
    .populate("student", "name profileImage")
    .populate("course", "title")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, items: ratings });
}));

// POST Submit rating for preacher reply
app.post("/api/student/teachers/:teacherId/rate", protect, asyncHandler(async (req, res) => {
  const { courseId, rating, helpful, feedbackText, commentId, conversationId } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Invalid rating value (1-5)" });

  const ratingDoc = await TeacherRating.create({
    student: req.user._id,
    teacher: req.params.teacherId,
    course: courseId,
    comment: commentId || null,
    conversation: conversationId || null,
    rating,
    helpful: !!helpful,
    feedbackText
  });

  // Dynamically update Performance
  const ratings = await TeacherRating.find({ teacher: req.params.teacherId });
  const avgRating = ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length;
  const helpfulPct = (ratings.filter(r => r.helpful).length / ratings.length) * 100;

  await TeacherPerformance.findOneAndUpdate(
    { teacher: req.params.teacherId, course: courseId },
    {
      $set: {
        studentRatingAverage: avgRating,
        helpfulReplyPercentage: helpfulPct
      }
    },
    { upsert: true }
  );

  res.status(201).json({ success: true, item: ratingDoc });
}));

// ==========================================
// STUDENT PROGRESS & AUTO-COMPLETION APIS
// ==========================================

// GET Course progress statistics
app.get("/api/student/course/:courseId/progress", protect, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 }).lean();
  const progressDocs = await Progress.find({ student: studentId, course: courseId }).lean();

  const lessonsWithStatus = lessons.map((lesson, index) => {
    const prog = progressDocs.find(p => p.lesson.toString() === lesson._id.toString());
    let status = "not_started";
    let isCompleted = false;
    let watchPercent = 0;
    let watchSeconds = 0;

    if (prog) {
      isCompleted = prog.isCompleted;
      status = prog.status || (prog.isCompleted ? "completed" : "in_progress");
      watchPercent = prog.watchPercent || 0;
      watchSeconds = prog.watchSeconds || 0;
    }

    // Sequential lock mechanism:
    // First lesson is always unlocked. Subsequent lessons require previous lesson isCompleted to be true.
    let isLocked = false;
    if (index > 0) {
      const prevLesson = lessons[index - 1];
      const prevProg = progressDocs.find(p => p.lesson.toString() === prevLesson._id.toString());
      if (!prevProg || !prevProg.isCompleted) {
        isLocked = true;
      }
    }

    return {
      ...lesson,
      status,
      isCompleted,
      isLocked,
      watchPercent,
      watchSeconds
    };
  });

  const completedCount = lessonsWithStatus.filter(l => l.isCompleted).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Get or Create CourseProgress
  let courseProgress = await CourseProgress.findOne({ student: studentId, course: courseId });
  if (!courseProgress) {
    courseProgress = await CourseProgress.create({
      student: studentId,
      course: courseId,
      totalLessons: lessons.length,
      completedLessons: completedCount,
      progressPercentage: progressPct,
      status: progressPct === 100 ? "completed" : "in_progress"
    });
  } else {
    courseProgress.totalLessons = lessons.length;
    courseProgress.completedLessons = completedCount;
    courseProgress.progressPercentage = progressPct;
    courseProgress.status = progressPct === 100 ? "completed" : "in_progress";
    await courseProgress.save();
  }

  res.json({
    success: true,
    progressPercentage: progressPct,
    completedCount,
    totalLessons: lessons.length,
    lessons: lessonsWithStatus,
    certificateStatus: courseProgress.certificateStatus,
    certificateUrl: courseProgress.certificateUrl
  });
}));

// POST Update video watch progress & auto-complete
app.post("/api/student/lesson-progress/update", protect, asyncHandler(async (req, res) => {
  const { courseId, lessonId, watchPercent, watchSeconds, duration } = req.body;
  const studentId = req.user._id;

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  let prog = await Progress.findOne({ student: studentId, course: courseId, lesson: lessonId });
  if (!prog) {
    prog = new Progress({
      student: studentId,
      course: courseId,
      lesson: lessonId,
      status: "in_progress"
    });
  }

  prog.duration = duration || prog.duration || 0;
  prog.watchSeconds = Math.max(prog.watchSeconds || 0, watchSeconds || 0);
  prog.watchPercent = Math.max(prog.watchPercent || 0, watchPercent || 0);
  prog.lastWatchedAt = new Date();

  // Watch criteria verification (config or default 80%)
  const requiredPct = course.requiredWatchPercentage || 80;
  const eligibleForComplete = prog.watchPercent >= requiredPct;

  if (eligibleForComplete && course.completionMode === "auto" && !prog.isCompleted) {
    prog.isCompleted = true;
    prog.status = "completed";
    prog.completedAt = new Date();
  } else if (!prog.isCompleted) {
    prog.status = "in_progress";
  }

  await prog.save();

  // Recalculate Course progress
  const totalLessons = await Lesson.countDocuments({ course: courseId });
  const completedLessons = await Progress.countDocuments({ student: studentId, course: courseId, isCompleted: true });
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  await CourseProgress.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      totalLessons,
      completedLessons,
      progressPercentage: progressPct,
      status: progressPct === 100 ? "completed" : "in_progress"
    },
    { upsert: true }
  );

  res.json({
    success: true,
    item: prog,
    eligibleForComplete,
    progressPercentage: progressPct
  });
}));

// POST Manually Mark Lesson Complete (if eligible)
app.post("/api/student/lesson/:lessonId/mark-complete", protect, asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user._id;

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  let prog = await Progress.findOne({ student: studentId, course: courseId, lesson: req.params.lessonId });
  if (!prog) return res.status(400).json({ success: false, message: "No watch history found. Please watch the video first." });

  // Required watch check
  const requiredPct = course.requiredWatchPercentage || 80;
  if (prog.watchPercent < requiredPct) {
    return res.status(400).json({
      success: false,
      message: `You must watch at least ${requiredPct}% of the lesson video before marking it completed. (Current: ${Math.round(prog.watchPercent)}%)`
    });
  }

  prog.isCompleted = true;
  prog.status = "completed";
  prog.completedAt = new Date();
  await prog.save();

  // Recalculate
  const totalLessons = await Lesson.countDocuments({ course: courseId });
  const completedLessons = await Progress.countDocuments({ student: studentId, course: courseId, isCompleted: true });
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const cp = await CourseProgress.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      totalLessons,
      completedLessons,
      progressPercentage: progressPct,
      status: progressPct === 100 ? "completed" : "in_progress"
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, item: prog, courseProgress: cp });
}));

// POST Request Course Completion Certificate
app.post("/api/student/course/:courseId/request-certificate", protect, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const cp = await CourseProgress.findOne({ student: studentId, course: courseId });
  if (!cp || cp.progressPercentage < 100) {
    return res.status(400).json({ success: false, message: "Please complete 100% of all course lessons before requesting a certificate." });
  }

  cp.certificateStatus = "pending";
  await cp.save();

  // Notify admins and primary teacher
  const course = await Course.findById(courseId).lean();
  const admin = await User.findOne({ role: "main_admin" }).lean();
  
  if (admin) {
    await Notification.create({
      user: admin._id,
      audience: "admin",
      type: "info",
      title: "Certificate Request 🎓",
      message: `${req.user.name} has requested completion certificate for ${course.title}`,
      link: "/admin/certificates"
    });
    emitToUser(admin._id, "new_notification", { title: "New Certificate Request!" });
  }

  if (course.primaryTeacherId) {
    await Notification.create({
      user: course.primaryTeacherId,
      audience: "teacher",
      type: "info",
      title: "Certificate Request 🎓",
      message: `${req.user.name} has requested completion certificate for ${course.title}`,
      link: "/teacher/students"
    });
    emitToUser(course.primaryTeacherId, "new_notification", { title: "Student certificate request pending" });
  }

  res.json({ success: true, certificateStatus: "pending" });
}));

// GET Pending Certificate Requests (Admin / Teacher)
app.get("/api/admin/certificates/pending", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  let filter = { certificateStatus: "pending" };
  if (req.user.role === "teacher") {
    filter.course = { $in: req.user.assignedCourses || [] };
  }

  const list = await CourseProgress.find(filter)
    .populate("student", "name email phone mobile")
    .populate("course", "title category")
    .lean();

  res.json({ success: true, items: list });
}));

// PATCH Approve Certificate
app.patch("/api/admin/certificates/:progressId/approve", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const cp = await CourseProgress.findById(req.params.progressId);
  if (!cp) return res.status(404).json({ success: false, message: "Progress document not found" });

  const course = await Course.findById(cp.course).lean();

  cp.certificateStatus = "approved";
  cp.certificateApprovedAt = new Date();
  cp.certificateUrl = `/uploads/certificates/${cp.student}_${cp.course}.pdf`;
  await cp.save();

  // Notify Student
  await Notification.create({
    user: cp.student,
    audience: "user",
    type: "info",
    title: "Certificate Approved! 🎉",
    message: `Congratulations! Your course completion certificate for ${course.title} is approved.`,
    link: `/courses/${course._id}`
  });
  emitToUser(cp.student, "new_notification", { title: "Your certificate is approved!" });

  res.json({ success: true, item: cp });
}));

// PATCH Reject Certificate
app.patch("/api/admin/certificates/:progressId/reject", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const cp = await CourseProgress.findById(req.params.progressId);
  if (!cp) return res.status(404).json({ success: false, message: "Progress document not found" });

  cp.certificateStatus = "rejected";
  await cp.save();

  res.json({ success: true, item: cp });
}));

// GET Course completion reports (Admin/Teacher)
app.get("/api/admin/course-completion-report", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === "teacher") {
    filter.course = { $in: req.user.assignedCourses || [] };
  }

  const reports = await CourseProgress.find(filter)
    .populate("student", "name email status")
    .populate("course", "title category status")
    .sort({ progressPercentage: -1 })
    .lean();

  res.json({ success: true, items: reports });
}));

// 3. CHATBOT APIS
app.post("/api/chatbot/ask", protect, asyncHandler(async (req, res) => {
  const { conversationId, text } = req.body;
  const room = await ChatRoom.findById(conversationId);
  if (!room) return res.status(404).json({ success: false, message: "Conversation not found" });

  await ChatMessage.create({
    room: room._id,
    course: room.course,
    sender: req.user._id,
    text,
    messageType: "text",
    senderRole: "student"
  });

  let replyText = "";
  const lowText = text.toLowerCase();
  if (lowText.includes("doubt") || lowText.includes("lesson") || lowText.includes("yoga") || lowText.includes("gita")) {
    replyText = "Hare Krishna! If you have a lesson-specific query, please use the lesson comment box or choose the 'Chat with Preacher' option to get personalized support!";
  } else if (lowText.includes("access") || lowText.includes("lock") || lowText.includes("document") || lowText.includes("approve")) {
    replyText = "Hare Krishna! For approvals, upload your required devotee recommendation letter. If you have questions, please choose the 'Admin Support' option to connect with our support desk.";
  } else if (lowText.includes("complete") || lowText.includes("finish") || lowText.includes("certificate")) {
    replyText = "To finish your course, watch all lesson videos to the end, mark them complete, and submit all quiz assessments!";
  } else {
    replyText = "Hare Krishna! I am your course chatbot. If my options can't help, click the options below to chat directly with either Course Preacher or Admin Support!";
  }

  const botMsg = await ChatMessage.create({
    room: room._id,
    course: room.course,
    sender: req.user._id,
    text: replyText,
    messageType: "bot",
    senderRole: "bot",
    isBotMessage: true
  });

  const updatedSummary = (room.botSummary || "") + `\nStudent: ${text}\nBot: ${replyText}`;
  const updatedRoom = await ChatRoom.findByIdAndUpdate(
    room._id,
    {
      $set: { lastMessage: replyText, botSummary: updatedSummary, lastReplyBy: "bot" },
      $currentDate: { lastMessageAt: true }
    },
    { new: true }
  );

  res.json({ success: true, item: botMsg, room: updatedRoom });
}));

app.post("/api/chatbot/handoff", protect, asyncHandler(async (req, res) => {
  const { conversationId, targetType } = req.body;
  const room = await ChatRoom.findById(conversationId);
  if (!room) return res.status(404).json({ success: false, message: "Chat not found" });

  const course = await Course.findById(room.course).lean();
  let participants = [room.participants[0]];
  let assignedTeacherId = null;

  if (targetType === "teacher") {
    if (!room.course) {
      return res.status(400).json({
        success: false,
        message: "Preacher chat is available inside a course. Admin Support can help with anything else."
      });
    }
    const teacherId = course?.primaryTeacherId;
    if (!teacherId) return res.status(400).json({ success: false, message: "No preacher currently assigned to this course" });
    participants.push(teacherId);
    assignedTeacherId = teacherId;
  } else {
    const admin = await User.findOne({ role: "main_admin" }).lean();
    if (!admin) return res.status(404).json({ success: false, message: "Admin support unavailable" });
    participants.push(admin._id);
  }

  const updatedRoom = await ChatRoom.findByIdAndUpdate(
    room._id,
    {
      $set: {
        assignedToType: targetType,
        assignedTeacherId,
        participants,
        status: "open",
        lastMessage: `Handoff requested to ${targetType === "teacher" ? "Preacher" : "Admin"}`
      }
    },
    { new: true }
  )
    .populate("participants", "name email role profileImage isOnline lastSeen")
    .populate("assignedTeacherId", "name email role profileImage isOnline lastSeen")
    .populate("course", "title slug")
    .lean();

  const systemMsg = await ChatMessage.create({
    room: room._id,
    course: room.course,
    sender: req.user._id,
    text: `System: Routed conversation to ${targetType === "teacher" ? "the Course Preacher" : "Admin Support"}.`,
    messageType: "system",
    senderRole: "system"
  });

  if (targetType === "teacher") {
    emitToUser(assignedTeacherId, "new_chat_assigned", { room: updatedRoom });
  } else {
    emitToRole("main_admin", "new_chat_assigned", { room: updatedRoom });
  }

  res.json({ success: true, room: updatedRoom, systemMessage: systemMsg });
}));

// 4. DEVOTEE INACTIVITY & STUDENT PROGRESS APIS
app.get("/api/teacher/student-progress/:studentId", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const devotee = await User.findById(req.params.studentId).select("name email phone profileImage").lean();
  if (!devotee) return res.status(404).json({ success: false, message: "Devotee not found" });

  const assignedCourses = req.user.assignedCourses || [];
  const enrollments = await Enrollment.find({ student: devotee._id, course: { $in: assignedCourses } })
    .populate("course", "title")
    .lean();

  const details = await Promise.all(enrollments.map(async (e) => {
    const summary = await progressSummary(devotee._id, e.course._id);
    const act = await UserActivity.findOne({ user: devotee._id, course: e.course._id }).lean();
    return {
      course: e.course,
      progress: summary,
      lastActive: act ? act.lastActiveAt : null,
      currentLesson: act ? act.lesson : null
    };
  }));

  res.json({ success: true, devotee, items: details });
}));

app.get("/api/admin/inactive-students", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const inactive = await UserActivity.find({ lastActiveAt: { $lt: fiveDaysAgo } })
    .populate("user", "name email phone profileImage")
    .populate("course", "title")
    .sort({ lastActiveAt: 1 })
    .lean();

  res.json({ success: true, items: inactive });
}));

app.get("/api/teacher/inactive-students", protect, authorize("teacher"), asyncHandler(async (req, res) => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const assigned = req.user.assignedCourses || [];

  const inactive = await UserActivity.find({
    course: { $in: assigned },
    lastActiveAt: { $lt: fiveDaysAgo }
  })
    .populate("user", "name email phone profileImage")
    .populate("course", "title")
    .sort({ lastActiveAt: 1 })
    .lean();

  res.json({ success: true, items: inactive });
}));

app.post("/api/admin/students/:studentId/reminder", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const { message } = req.body;
  const devoteeId = req.params.studentId;

  await Notification.create({
    user: devoteeId,
    audience: "user",
    type: "reminder",
    title: "Preacher Study Reminder ✨",
    message: message || "Hare Krishna! Please continue your Gita Gyan study lessons today.",
    link: "/dashboard"
  });

  emitToUser(devoteeId, "new_notification", { title: "New reminder from preacher!" });

  res.json({ success: true, message: "Reminder sent successfully" });
}));


// --- DYNAMIC CRUD ROUTES MUST BE LAST ---
app.get("/api/admin/:group/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { Model } = adminResource(`${req.params.group}/${req.params.resource}`);
  const item = await Model.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });
  res.json({ success: true, item });
}));
/* ---------------- activity log ---------------- */

app.get("/api/admin/activity-log", protect, staffGate, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.user) filter.user = req.query.user;
  if (req.query.action && req.query.action !== "all") filter.action = req.query.action;
  if (req.query.section && req.query.section !== "all") filter.section = req.query.section;
  if (req.query.source && req.query.source !== "all") filter.source = req.query.source;
  if (req.query.search) {
    const rx = new RegExp(req.query.search, "i");
    filter.$or = [{ label: rx }, { userName: rx }, { resource: rx }, { ip: rx }];
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit || "60", 10), 1), 200);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(filter)
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
}));

app.get("/api/admin/activity-log/:id", protect, staffGate, asyncHandler(async (req, res) => {
  const item = await ActivityLog.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ success: false, message: "Entry not found" });
  res.json({ success: true, item });
}));

/* Puts a deleted document back, using the snapshot taken at delete
   time. Only main_admin can do this — it is the safety net, so it
   should not itself be delegable. */
app.put("/api/admin/activity-log/:id/restore", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const entry = await ActivityLog.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Entry not found" });
  if (entry.action !== "delete") {
    return res.status(400).json({ success: false, message: "Only deletions can be restored." });
  }
  if (entry.restored) {
    return res.status(400).json({ success: false, message: "This item has already been restored." });
  }
  if (!entry.before) {
    return res.status(400).json({ success: false, message: "No snapshot was stored for this deletion." });
  }

  const Model = modelRegistry[entry.resource];
  if (!Model) return res.status(400).json({ success: false, message: `Cannot restore unknown type: ${entry.resource}` });

  const exists = await Model.findById(entry.resourceId).lean();
  if (exists) {
    return res.status(400).json({ success: false, message: "An item with this id already exists." });
  }

  const doc = { ...entry.before };
  delete doc.__v;
  let restored;
  try {
    restored = await Model.create(doc);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Could not restore: ${err.message}` });
  }

  entry.restored = true;
  entry.restoredAt = new Date();
  entry.restoredBy = req.user._id;
  await entry.save();

  await recordActivity(req, {
    action: "restore",
    section: entry.section,
    resource: entry.resource,
    resourceId: String(restored._id),
    label: entry.label,
    after: restored.toObject ? restored.toObject() : restored
  });

  res.json({ success: true, message: `"${entry.label || entry.resource}" has been restored.`, item: restored });
}));

/* ---------------- login sessions ---------------- */

app.get("/api/admin/sessions", protect, staffGate, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.user) filter.user = req.query.user;
  if (req.query.active === "true") filter.active = true;
  const limit = Math.min(Math.max(parseInt(req.query.limit || "60", 10), 1), 200);
  const items = await LoginSession.find(filter).sort({ loginAt: -1 }).limit(limit).lean();
  res.json({ success: true, items });
}));

app.delete("/api/admin/sessions/:id", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const session = await LoginSession.findByIdAndUpdate(
    req.params.id,
    { active: false, endedAt: new Date() },
    { new: true }
  );
  if (!session) return res.status(404).json({ success: false, message: "Session not found" });
  res.json({ success: true, message: "Session marked as ended." });
}));

/* ---------------- staff roles & permissions ---------------- */

/* What the panel needs to draw the permission matrix. */
app.get("/api/admin/access-meta", protect, staffGate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    sections: ADMIN_SECTIONS,
    roles: STAFF_ROLES.map((role) => ({ role, level: ROLE_LEVEL[role] })),
    myRole: req.user.role,
    myLevel: roleLevel(req.user)
  });
}));

/* Staff accounts this user is allowed to see and manage. */
app.get("/api/admin/staff", protect, staffGate, asyncHandler(async (req, res) => {
  const items = await User.find({ role: { $in: STAFF_ROLES } })
    .select("name email phone role sectionAccess status managedBy isOnline lastSeen createdAt")
    .populate("managedBy", "name role")
    .sort({ createdAt: -1 })
    .lean();
  const myLevel = roleLevel(req.user);
  res.json({
    success: true,
    items: items.map((u) => ({
      ...u,
      level: ROLE_LEVEL[u.role] ?? 0,
      /* main_admin can manage everyone but themselves */
      manageable: req.user.role === "main_admin"
        ? String(u._id) !== String(req.user._id)
        : (ROLE_LEVEL[u.role] ?? 0) < myLevel
    }))
  });
}));

app.post("/api/admin/staff", protect, staffGate, asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, sectionAccess } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required." });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: "Pick a valid staff role." });
  }
  if (req.user.role !== "main_admin" && (ROLE_LEVEL[role] ?? 0) >= roleLevel(req.user)) {
    return res.status(403).json({ success: false, message: "You cannot create an account at or above your own role." });
  }
  if (await User.findOne({ email: String(email).toLowerCase() })) {
    return res.status(400).json({ success: false, message: "That email is already registered." });
  }

  const staff = await User.create({
    name,
    email,
    password,
    phone,
    role,
    sectionAccess: Array.isArray(sectionAccess) ? sectionAccess.filter((g) => ADMIN_SECTIONS.includes(g.section)) : [],
    managedBy: req.user._id,
    status: "active",
    emailVerified: true
  });

  const safe = staff.toObject();
  delete safe.password;
  await recordActivity(req, {
    action: "create",
    section: "users",
    resource: "users",
    resourceId: String(staff._id),
    label: `${name} (${role})`,
    after: safe
  });
  res.status(201).json({ success: true, item: safe, message: `${name} can now sign in to the admin panel.` });
}));

app.put("/api/admin/staff/:id/access", protect, staffGate, asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: "User not found" });
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({ success: false, message: "You cannot change your own permissions." });
  }
  if (req.user.role !== "main_admin" && roleLevel(target) >= roleLevel(req.user)) {
    return res.status(403).json({ success: false, message: "You cannot change an account at or above your own role." });
  }

  const before = target.toObject();
  delete before.password;

  if (req.body.role) {
    if (!STAFF_ROLES.includes(req.body.role)) {
      return res.status(400).json({ success: false, message: "Pick a valid staff role." });
    }
    if (req.user.role !== "main_admin" && (ROLE_LEVEL[req.body.role] ?? 0) >= roleLevel(req.user)) {
      return res.status(403).json({ success: false, message: "You cannot grant a role at or above your own." });
    }
    target.role = req.body.role;
  }
  if (Array.isArray(req.body.sectionAccess)) {
    target.sectionAccess = req.body.sectionAccess.filter((g) => ADMIN_SECTIONS.includes(g.section));
  }
  if (req.body.status) target.status = req.body.status;
  await target.save();

  const after = target.toObject();
  delete after.password;
  await recordActivity(req, {
    action: "update",
    section: "users",
    resource: "users",
    resourceId: String(target._id),
    label: `${target.name} access`,
    before,
    after,
    changedFields: ["role", "sectionAccess", "status"].filter((k) => req.body[k] !== undefined)
  });

  res.json({ success: true, item: after, message: "Permissions updated." });
}));

app.put("/api/admin/:group/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { name, Model } = adminResource(`${req.params.group}/${req.params.resource}`);
  const item = await Model.findByIdAndUpdate(req.params.id, prepareAdminBody(name, req.body, req.user._id), { new: true, runValidators: true });
  res.json({ success: true, item });
}));
app.delete("/api/admin/:group/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { Model } = adminResource(`${req.params.group}/${req.params.resource}`);
  await Model.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Deleted successfully" });
}));
// --- EXAM SYSTEM: STUDENT ENDPOINTS ---
app.get("/api/student/exams/my-exams", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("enrolledCourses.course");
  const courseIds = user.enrolledCourses.map(e => e.course?._id).filter(Boolean);
  const now = new Date();
  const assignments = await ExamAssignment.find({
    course: { $in: courseIds },
    isActive: true,
    $or: [{ startDate: { $lte: now } }, { startDate: null }],
    $or: [{ endDate: { $gte: now } }, { endDate: null }]
  }).populate("exam course");
  
  // also fetch user's attempts to know if they completed it
  const attempts = await ExamAttempt.find({ user: req.user._id }).populate("exam");

  res.json({ success: true, assignments, attempts });
}));

app.get("/api/student/exams/course/:courseId", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const now = new Date();
  const assignments = await ExamAssignment.find({
    course: req.params.courseId,
    isActive: true,
    $or: [{ startDate: { $lte: now } }, { startDate: null }],
    $or: [{ endDate: { $gte: now } }, { endDate: null }]
  }).populate("exam");
  res.json({ success: true, items: assignments });
}));

app.post("/api/student/exams/:examId/start", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { assignmentId } = req.body;
  const exam = await ExamPaper.findById(examId);
  if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

  let activeAttempt = await ExamAttempt.findOne({ exam: examId, user: req.user._id, status: "in_progress" });
  if (activeAttempt) {
    return res.json({ success: true, attempt: activeAttempt });
  }

  const pastAttempts = await ExamAttempt.countDocuments({ exam: examId, user: req.user._id });
  let assignment = assignmentId ? await ExamAssignment.findById(assignmentId) : null;
  let maxAttempts = 1;

  if (assignment) {
    maxAttempts = assignment.maxAttempts;
  } else {
    const Enrollment = mongoose.model("Enrollment");
    const enrollments = await Enrollment.find({ student: req.user._id, status: { $in: ["active", "completed"] } });
    const courseIds = enrollments.map(e => e.course);
    const assignments = await ExamAssignment.find({ exam: examId, isActive: true, course: { $in: courseIds } });
    
    if (assignments.length > 0) {
      maxAttempts = Math.max(...assignments.map(a => a.maxAttempts || 1));
    } else {
      // If no assignments, check if exam paper itself has maxAttempts (fallback)
      maxAttempts = exam.maxAttempts || 1;
    }
  }

  if (pastAttempts >= maxAttempts) {
    return res.status(400).json({ success: false, message: "Maximum attempts reached for this exam." });
  }

  const mcqs = await ExamQuestion.aggregate([
    { $match: { questionBank: exam.questionBank, type: "MCQ" } },
    { $sample: { size: exam.numMcqsToPick || 0 } }
  ]);
  const objectives = await ExamQuestion.aggregate([
    { $match: { questionBank: exam.questionBank, type: "OBJECTIVE" } },
    { $sample: { size: exam.numObjectiveToPick || 0 } }
  ]);

  const selectedQuestions = [...mcqs, ...objectives].map(q => q._id);
  for (let i = selectedQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
  }

  const attempt = await ExamAttempt.create({
    exam: examId,
    user: req.user._id,
    assignment: assignmentId || null,
    totalMarks: exam.totalMarks,
    selectedQuestions
  });

  res.json({ success: true, attempt });
}));

app.get("/api/student/exams/attempt/:attemptId", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findById(req.params.attemptId).populate("exam").populate("selectedQuestions");
  if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
  if (attempt.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

  const responses = await ExamResponse.find({ attempt: attempt._id });
  
  if (attempt.status === "in_progress") {
    attempt.selectedQuestions.forEach(q => {
      q.fullModelAnswer = undefined;
      q.expectedKeywords = undefined;
      if (q.options) {
        q.options.forEach(opt => opt.isCorrect = undefined);
      }
    });
  }

  res.json({ success: true, attempt, responses });
}));

app.put("/api/student/exams/attempt/:attemptId/save", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findById(req.params.attemptId);
  if (!attempt || attempt.status !== "in_progress") return res.status(400).json({ success: false, message: "Cannot modify this attempt" });
  
  const { responses } = req.body;
  if (Array.isArray(responses)) {
    for (const update of responses) {
      if (!update.questionId) continue;
      await ExamResponse.findOneAndUpdate(
        { attempt: attempt._id, question: update.questionId },
        { 
          mcqSelectedOptionId: update.selectedOption || update.mcqSelectedOptionId, 
          objectiveAnswerText: update.answerText || update.objectiveAnswerText 
        },
        { upsert: true, new: true }
      );
    }
  }

  res.json({ success: true });
}));

app.post("/api/student/exams/attempt/:attemptId/submit", protect, authorize("student", "devotee", "user"), asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findById(req.params.attemptId).populate("selectedQuestions");
  if (!attempt || attempt.status !== "in_progress") return res.status(400).json({ success: false, message: "Attempt already submitted" });

  const responses = await ExamResponse.find({ attempt: attempt._id });
  let totalScore = 0;
  let hasManualEvaluation = false;

  for (const q of attempt.selectedQuestions) {
    const response = responses.find(r => r.question && r.question.toString() === q._id.toString());
    if (!response) continue;

    if (q.type === "MCQ") {
      const correctOption = q.options.find(o => o.isCorrect);
      if (correctOption && response.mcqSelectedOptionId && correctOption._id.toString() === response.mcqSelectedOptionId.toString()) {
        response.marksAwarded = q.marks;
        totalScore += q.marks;
      } else {
        response.marksAwarded = 0;
      }
      await response.save();
    } else if (q.type === "OBJECTIVE") {
      if (q.autoEvaluate && q.expectedKeywords && q.expectedKeywords.length > 0 && response.objectiveAnswerText) {
        const text = response.objectiveAnswerText.toLowerCase();
        const matched = q.expectedKeywords.filter(kw => text.includes(kw.toLowerCase()));
        const ratio = matched.length / q.expectedKeywords.length;
        response.marksAwarded = parseFloat((q.marks * ratio).toFixed(2));
        totalScore += response.marksAwarded;
        hasManualEvaluation = true;
      } else {
        hasManualEvaluation = true;
      }
      await response.save();
    }
  }

  attempt.score = totalScore;
  
  // Calculate if passed
  const exam = await mongoose.model("ExamPaper").findById(attempt.exam);
  const passingMarks = exam?.passingMarks || 0;
  const isPassed = totalScore >= passingMarks;
  
  attempt.status = hasManualEvaluation ? "submitted" : (isPassed ? "passed" : "failed");
  attempt.submittedAt = new Date();
  await attempt.save();

  try {
    const Lesson = mongoose.model("Lesson");
    const CourseContent = mongoose.model("CourseContent");
    const Progress = mongoose.model("Progress");
    
    // Check max attempts
    const pastAttempts = await ExamAttempt.countDocuments({ exam: attempt.exam, user: req.user._id });
    let maxAttempts = 1;
    if (attempt.assignment) {
      const assignment = await mongoose.model("ExamAssignment").findById(attempt.assignment);
      if (assignment) maxAttempts = assignment.maxAttempts;
    } else {
      const Enrollment = mongoose.model("Enrollment");
      const enrollments = await Enrollment.find({ student: req.user._id, status: { $in: ["active", "completed"] } });
      const courseIds = enrollments.map(e => e.course);
      const assignments = await mongoose.model("ExamAssignment").find({ exam: attempt.exam, isActive: true, course: { $in: courseIds } });
      if (assignments.length > 0) {
        maxAttempts = Math.max(...assignments.map(a => a.maxAttempts || 1));
      } else {
        maxAttempts = exam?.maxAttempts || 1;
      }
    }
    
    // Only mark as complete if they passed, or reached max attempts, or it requires manual grading
    if (isPassed || pastAttempts >= maxAttempts || hasManualEvaluation) {
      let lessonObj = await Lesson.findOne({ examPaper: attempt.exam });
      if (!lessonObj) {
        const content = await CourseContent.findOne({ examPaper: attempt.exam, type: "exam" });
        if (content) {
          lessonObj = await Lesson.findById(content.lesson);
        }
      }
      
      if (lessonObj) {
        let prog = await Progress.findOne({ student: req.user._id, lesson: lessonObj._id });
        if (!prog) {
          prog = new Progress({
            student: req.user._id,
            course: lessonObj.course,
            lesson: lessonObj._id,
            watchPercent: 100,
          });
        }
        if (!prog.isCompleted) {
          prog.isCompleted = true;
          prog.status = "completed";
          prog.completedAt = new Date();
          await prog.save();
          
          const summary = await progressSummary(req.user._id, lessonObj.course);
          if (summary.percent === 100) {
            const Enrollment = mongoose.model("Enrollment");
            const enrollment = await Enrollment.findOne({ student: req.user._id, course: lessonObj.course, status: "active" });
            if (enrollment) {
              await Enrollment.findByIdAndUpdate(enrollment._id, { status: "completed", completedAt: new Date() });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error updating progress after exam submit:", e);
  }

  res.json({ success: true, attempt });
}));

app.post("/api/admin/exams/evaluate/:responseId", ...adminOnly, asyncHandler(async (req, res) => {
  const { marksAwarded, evaluationNote } = req.body;
  const response = await ExamResponse.findById(req.params.responseId).populate("attempt");
  if (!response) return res.status(404).json({ success: false, message: "Response not found" });

  const oldMarks = response.marksAwarded || 0;
  response.marksAwarded = marksAwarded;
  response.evaluationNote = evaluationNote;
  response.evaluatedBy = req.user._id;
  await response.save();

  const attempt = await ExamAttempt.findById(response.attempt._id);
  attempt.score = attempt.score - oldMarks + marksAwarded;
  attempt.status = "evaluated";
  await attempt.save();

  res.json({ success: true, response });
}));

app.get("/api/admin/exam-attempts", ...adminOnly, asyncHandler(async (req, res) => {
  let query = {};
  if (req.query.status) query.status = { $in: req.query.status.split(",") };
  
  // Find all attempts to calculate attempt number
  const allAttempts = await ExamAttempt.find({}).sort({ startedAt: 1 }).lean();
  
  const attempts = await ExamAttempt.find(query)
    .populate("user", "name email")
    .populate("exam", "title")
    .populate({ path: "assignment", populate: { path: "course", select: "title" } })
    .sort({ submittedAt: -1, startedAt: -1 })
    .lean();

  // Attach attempt numbers
  const attemptsWithNumber = attempts.map(attempt => {
    const userAttemptsForExam = allAttempts.filter(a => a.user?.toString() === attempt.user?._id?.toString() && a.exam?.toString() === attempt.exam?._id?.toString());
    const attemptIndex = userAttemptsForExam.findIndex(a => a._id.toString() === attempt._id.toString());
    return { ...attempt, attemptNumber: attemptIndex + 1 };
  });

  res.json({ success: true, items: attemptsWithNumber });
}));

app.get("/api/admin/exam-attempts/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findById(req.params.id).populate("user", "name email").populate("exam", "title").populate("selectedQuestions");
  if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
  
  const responses = await ExamResponse.find({ attempt: attempt._id }).populate("question").populate("mcqSelectedOptionId");
  res.json({ success: true, ...attempt.toObject(), responses });
}));

app.get("/api/admin/exams/:examId/attempts", ...adminOnly, asyncHandler(async (req, res) => {
  const attempts = await ExamAttempt.find({ exam: req.params.examId }).populate("user", "name email").sort({ submittedAt: -1, startedAt: -1 });
  res.json({ success: true, items: attempts });
}));

app.get("/api/admin/exams/attempt/:attemptId", ...adminOnly, asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findById(req.params.attemptId).populate("user", "name email").populate("exam").populate("selectedQuestions");
  if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
  
  const responses = await ExamResponse.find({ attempt: attempt._id }).populate("mcqSelectedOptionId").populate("question");
  res.json({ success: true, attempt, responses });
}));

// --- COURSE CONTENT API ---
app.get("/api/admin/lessons/:lessonId/content", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const contents = await CourseContent.find({ lesson: req.params.lessonId }).sort({ order: 1 }).populate("examPaper");
  res.json({ success: true, items: contents });
}));

app.get("/api/lessons/:lessonId/content", protect, authorizeLearner, asyncHandler(async (req, res) => {
  const contents = await CourseContent.find({ lesson: req.params.lessonId, isActive: true }).sort({ order: 1 }).populate("examPaper");
  res.json({ success: true, items: contents });
}));

app.post("/api/lessons/:lessonId/content", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  const content = await CourseContent.create({ ...req.body, course: lesson.course, lesson: lesson._id });
  res.status(201).json({ success: true, item: content });
}));

app.put("/api/content/:id", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const content = await CourseContent.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, item: content });
}));

app.delete("/api/content/:id", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  await CourseContent.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Deleted" });
}));

// --- EXAM ASSIGNMENT OVERRIDES ---
app.post("/api/admin/exam-assignments", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const assignment = await ExamAssignment.create(req.body);
  const exam = await ExamPaper.findById(assignment.exam);
  
  // Create CourseContent for this exam
  await CourseContent.create({
    course: assignment.course,
    lesson: assignment.lesson,
    type: "exam",
    title: exam.title,
    slug: `exam-${exam._id}-${Date.now()}`,
    order: 99, // default to end of lesson
    examPaper: exam._id,
    isActive: assignment.isActive
  });
  
  res.status(201).json({ success: true, item: assignment });
}));

app.put("/api/admin/exam-assignments/:id", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const assignment = await ExamAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  // Update associated CourseContent if exists
  await CourseContent.findOneAndUpdate(
    { course: assignment.course, examPaper: assignment.exam },
    { isActive: assignment.isActive, lesson: assignment.lesson }
  );
  res.json({ success: true, item: assignment });
}));

app.delete("/api/admin/exam-assignments/:id", protect, authorize("main_admin", "teacher"), asyncHandler(async (req, res) => {
  const assignment = await ExamAssignment.findById(req.params.id);
  if (assignment) {
    await CourseContent.findOneAndDelete({ course: assignment.course, examPaper: assignment.exam });
    await assignment.deleteOne();
  }
  res.json({ success: true, message: "Deleted" });
}));

app.get("/api/admin/assets", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const getFiles = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getFiles(filePath, fileList);
      } else {
        const ext = path.extname(file).toLowerCase();
        let type = "document";
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) type = "image";
        else if ([".mp4", ".webm", ".mov", ".avi"].includes(ext)) type = "video";
        else if (ext === ".pdf") type = "pdf";
        
        const relativePath = path.relative(uploadRoot, filePath).replace(/\\/g, "/");
        
        fileList.push({
          name: file,
          path: relativePath,
          url: `/uploads/${relativePath}`,
          size: stat.size,
          createdAt: stat.birthtime || stat.ctime,
          type
        });
      }
    }
    return fileList;
  };
  
  const files = getFiles(uploadRoot);
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ success: true, items: files });
}));

app.delete("/api/admin/assets", protect, authorize("main_admin"), asyncHandler(async (req, res) => {
  const { paths } = req.body;
  if (!Array.isArray(paths)) return res.status(400).json({ success: false, message: "Invalid request" });
  
  let deleted = 0;
  for (const relativePath of paths) {
    if (relativePath.includes("..")) continue;
    const fullPath = path.join(uploadRoot, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        deleted++;
      } catch (err) {}
    }
  }
  res.json({ success: true, message: `Deleted ${deleted} files` });
}));

app.get("/api/admin/:resource(*)", ...adminOnly, asyncHandler(async (req, res, next) => {
  if (req.params.resource.includes("/") && !aliases[req.params.resource]) return next();
  const { name, Model } = adminResource(req.params.resource);
  return list(req, res, Model, adminFilter(req, name, req.params.resource), { populate: name === "courses" ? { path: "teacher", select: "name email" } : name === "lessons" ? { path: "course", select: "title slug" } : name === "course-requests" ? [{ path: "student", select: "name email phone" }, { path: "course", select: "title slug" }] : name === "pilgrimage-bookings" ? [{ path: "user", select: "name email phone" }, { path: "pilgrimage", select: "title slug image" }] : undefined });
}));
app.post("/api/admin/:resource(*)", ...adminOnly, asyncHandler(async (req, res) => {
  const { name, Model } = adminResource(req.params.resource);
  const item = await Model.create(prepareAdminBody(name, req.body, req.user._id));
  await recordActivity(req, {
    action: "create",
    section: sectionFor(req.params.resource),
    resource: name,
    resourceId: String(item._id),
    label: labelFor(item.toObject ? item.toObject() : item),
    after: item.toObject ? item.toObject() : item
  });
  res.status(201).json({ success: true, item });
}));
app.get("/api/admin/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { Model } = adminResource(req.params.resource);
  const item = await Model.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });
  res.json({ success: true, item });
}));
app.put("/api/admin/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { name, Model } = adminResource(req.params.resource);
  const data = prepareAdminBody(name, req.body, req.user._id);
  const before = await Model.findById(req.params.id).lean();

  const logUpdate = async (after) => {
    const changed = Object.keys(data).filter(
      (k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])
    );
    await recordActivity(req, {
      action: "update",
      section: sectionFor(req.params.resource),
      resource: name,
      resourceId: String(req.params.id),
      label: labelFor(after || before || {}),
      before,
      after,
      changedFields: changed
    });
  };

  if (name === "users") {
    const target = await User.findById(req.params.id).select("+password");
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    /* Nobody may edit an account at or above their own level. */
    if (req.user.role !== "main_admin" && roleLevel(target) >= roleLevel(req.user)) {
      return res.status(403).json({ success: false, message: "You cannot modify an account at or above your own role." });
    }
    if (data.role && req.user.role !== "main_admin" && (ROLE_LEVEL[data.role] ?? 0) >= roleLevel(req.user)) {
      return res.status(403).json({ success: false, message: "You cannot grant a role at or above your own." });
    }
    Object.assign(target, data);
    await target.save();
    const after = target.toObject();
    delete after.password;
    await logUpdate(after);
    return res.json({ success: true, item: target });
  }

  const after = await Model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  await logUpdate(after?.toObject ? after.toObject() : after);
  res.json({ success: true, item: after });
}));
app.delete("/api/admin/:resource/:id", ...adminOnly, asyncHandler(async (req, res) => {
  const { name, Model } = adminResource(req.params.resource);
  if (name === "users" && req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: "You cannot delete your own account" });
  }
  const before = await Model.findById(req.params.id).lean();
  if (!before) return res.status(404).json({ success: false, message: "Item not found" });

  if (name === "users" && req.user.role !== "main_admin" && roleLevel(before) >= roleLevel(req.user)) {
    return res.status(403).json({ success: false, message: "You cannot delete an account at or above your own role." });
  }

  await Model.findByIdAndDelete(req.params.id);
  /* `before` holds the whole document, which is what restore reads. */
  await recordActivity(req, {
    action: "delete",
    section: sectionFor(req.params.resource),
    resource: name,
    resourceId: String(req.params.id),
    label: labelFor(before),
    before
  });
  res.json({ success: true, message: "Deleted successfully" });
}));

app.use((req, res) => res.status(404).json({ success: false, message: `Not found - ${req.originalUrl}` }));
app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server error", details: error.errors ? Object.values(error.errors).map((item) => item.message) : undefined }));

const runMigration = async () => {
  try {
    const lessons = await Lesson.find({});
    for (const lesson of lessons) {
      const existing = await CourseContent.findOne({ lesson: lesson._id });
      if (!existing && (lesson.youtubeUrl || lesson.videoUrl || lesson.uploadedVideo || lesson.pdfFile)) {
        let type = "video";
        if (!lesson.youtubeUrl && !lesson.videoUrl && !lesson.uploadedVideo && lesson.pdfFile) type = "pdf";
        await CourseContent.create({
          course: lesson.course,
          lesson: lesson._id,
          type,
          title: lesson.title,
          slug: lesson.slug + "-content",
          order: 1,
          videoType: lesson.videoType,
          youtubeUrl: lesson.youtubeUrl,
          videoUrl: lesson.videoUrl,
          uploadedVideo: lesson.uploadedVideo,
          pdfFile: lesson.pdfFile,
          thumbnail: lesson.thumbnail,
          duration: lesson.duration,
          videoSettings: lesson.videoSettings
        });
      }
    }
    console.log("Migration check passed");
  } catch (err) {
    console.error("Migration failed", err);
  }
};

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms", { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    await runMigration();
    server.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  });
