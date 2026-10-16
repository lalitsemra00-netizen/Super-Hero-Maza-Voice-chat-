require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Database = require("sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.error("Missing ADMIN_USERNAME, ADMIN_PASSWORD, or SESSION_SECRET. Copy .env.example to .env and configure it.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

\`const sqlite3= require('sqlite3').verbose();\`
`const db= new sqlite3.Database(path.join(DATA_DIR,"agency.sqlite"
`db.run("PRAGMA journal|\_mode=WAL;");\`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT UNIQUE NOT NULL,
  price TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
const insertOffer = db.prepare("INSERT OR IGNORE INTO offers (plan, price, value) VALUES (?, ?, ?)");
[
 ["SVIP-1","1975","3 lakh"],["SVIP-2","6700","11 lakh"],["SVIP-3","14500","25 lakh"],
 ["SVIP-4","29000","50 lakh"],["SVIP-5","57000","1 crore"],["SVIP-6","142500","2.5 crore"],
 ["SVIP-7","285000","5 crore"],["SVIP-8","570000","10 crore"]
].forEach(x => insertOffer.run(...x));

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(session({
  name: "shmvc.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
  // For production with multiple server instances, replace MemoryStore with a persistent session store.
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ error: "Admin login required." });
}
function safeError(res, err) {
  console.error(err);
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large. Maximum upload size is 100 MB." });
  }
  return res.status(400).json({ error: "Request could not be completed. Check the fields and try again." });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
    cb(null, crypto.randomBytes(18).toString("hex") + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okImage = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    const okVideo = /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    if (okImage || okVideo) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP, GIF images or MP4, WEBM, MOV videos are allowed."));
  }
});

app.use("/uploads", express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: "deny",
  setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff")
}));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/media", (_req, res) => {
  const rows = db.prepare("SELECT id,title,filename,mime_type,media_type,created_at FROM media ORDER BY id DESC").all();
  res.json(rows.map(r => ({ ...r, url: "/uploads/" + encodeURIComponent(r.filename) })));
});
app.get("/api/sellers", (_req, res) => {
  res.json(db.prepare("SELECT id,name,city,contact,created_at FROM sellers ORDER BY name COLLATE NOCASE").all());
});
app.get("/api/offers", (_req, res) => res.json(db.prepare("SELECT id,plan,price,value,updated_at FROM offers ORDER BY id").all()));

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") return res.status(400).json({ error: "Enter username and password." });
    const admin = db.prepare("SELECT id,username,password_hash FROM admins WHERE username = ?").get(username);
    const ok = admin && await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect username or password." });
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: "Could not create secure session." });
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      res.json({ ok: true, username: admin.username });
    });
  } catch (err) { safeError(res, err); }
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Could not log out." });
    res.clearCookie("shmvc.sid", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.json({ ok: true });
  });
});
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ ok: true, username: req.session.username }));

app.post("/api/admin/media", requireAdmin, (req, res) => {
  upload.single("media")(req, res, err => {
    if (err) return safeError(res, err);
    try {
      if (!req.file) return res.status(400).json({ error: "Choose an image or video first." });
      const title = String(req.body.title || "").trim().slice(0, 120) || "Agency update";
      const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";
      const result = db.prepare("INSERT INTO media (title,filename,original_name,mime_type,media_type) VALUES (?,?,?,?,?)")
        .run(title, req.file.filename, path.basename(req.file.originalname).slice(0, 180), req.file.mimetype, mediaType);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (e) {
      if (req.file) fs.unlink(req.file.path, () => {});
      safeError(res, e);
    }
  });
});
app.delete("/api/admin/media/:id", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT id,filename FROM media WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Post not found." });
  db.prepare("DELETE FROM media WHERE id = ?").run(row.id);
  fs.unlink(path.join(UPLOAD_DIR, row.filename), () => {});
  res.json({ ok: true });
});

app.post("/api/admin/sellers", requireAdmin, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const city = String(req.body.city || "").trim().slice(0, 100);
  const contact = String(req.body.contact || "").trim().slice(0, 80);
  if (!name || !city) return res.status(400).json({ error: "Seller name and city are required." });
  const result = db.prepare("INSERT INTO sellers (name,city,contact) VALUES (?,?,?)").run(name, city, contact);
  res.json({ ok: true, id: result.lastInsertRowid });
});
app.put("/api/admin/sellers/:id", requireAdmin, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const city = String(req.body.city || "").trim().slice(0, 100);
  const contact = String(req.body.contact || "").trim().slice(0, 80);
  if (!name || !city) return res.status(400).json({ error: "Seller name and city are required." });
  const result = db.prepare("UPDATE sellers SET name=?,city=?,contact=? WHERE id=?").run(name, city, contact, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Seller not found." });
  res.json({ ok: true });
});
app.delete("/api/admin/sellers/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM sellers WHERE id=?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Seller not found." });
  res.json({ ok: true });
});

app.put("/api/admin/offers/:id", requireAdmin, (req, res) => {
  const price = String(req.body.price || "").trim().slice(0, 30);
  const value = String(req.body.value || "").trim().slice(0, 50);
  if (!price || !value) return res.status(400).json({ error: "Price and diamond value are required." });
  const result = db.prepare("UPDATE offers SET price=?,value=?,updated_at=datetime('now') WHERE id=?").run(price, value, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Offer not found." });
  res.json({ ok: true });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  res.sendFile(path.join(__dirname, "public", "index.html"), err => { if (err) next(err); });
});

(async () => {
  const username = process.env.ADMIN_USERNAME.trim();
  const password = process.env.ADMIN_PASSWORD;
  const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) db.prepare("UPDATE admins SET password_hash=? WHERE id=?").run(passwordHash, existing.id);
  else db.prepare("INSERT INTO admins (username,password_hash) VALUES (?,?)").run(username, passwordHash);
  app.listen(PORT, () => console.log(`Super Hero Maza Voice Chat running on port ${PORT}`));
})().catch(err => { console.error(err); process.exit(1); });
