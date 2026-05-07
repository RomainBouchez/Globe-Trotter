import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createHttpServer } from 'http';
import Database from 'better-sqlite3';
import exifr from 'exifr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// SQLite setup
const db = new Database(path.join(DATA_DIR, 'photos.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name    TEXT NOT NULL,
    filename     TEXT NOT NULL,
    original_name TEXT NOT NULL,
    url          TEXT NOT NULL,
    uploaded_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sub_cities (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_city_name TEXT NOT NULL,
    sub_city_name    TEXT NOT NULL,
    description      TEXT DEFAULT '',
    created_at       TEXT NOT NULL,
    UNIQUE(parent_city_name, sub_city_name)
  );
`);

// Schema migrations — add columns if they don't exist yet
{
  const cols = db.prepare('PRAGMA table_info(photos)').all().map(r => r.name);
  if (!cols.includes('is_preview'))    db.exec('ALTER TABLE photos ADD COLUMN is_preview    INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('featured_order')) db.exec('ALTER TABLE photos ADD COLUMN featured_order INTEGER DEFAULT NULL');
  if (!cols.includes('taken_at'))      db.exec('ALTER TABLE photos ADD COLUMN taken_at TEXT DEFAULT NULL');
}

// Multer — disk storage (Option A)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cityDir = path.join(PHOTOS_DIR, req.params.cityName);
    if (!fs.existsSync(cityDir)) fs.mkdirSync(cityDir, { recursive: true });
    cb(null, cityDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/i;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext) && allowed.test(file.mimetype.split('/')[1]));
  }
});

const app = express();
const httpServer = createHttpServer(app);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(PHOTOS_DIR));

// GET /api/sub-cities — all dynamic sub-cities grouped by parent
app.get('/api/sub-cities', (req, res) => {
  const rows = db.prepare(`
    SELECT parent_city_name AS parentCityName, sub_city_name AS subCityName, description
    FROM sub_cities ORDER BY id ASC
  `).all();
  res.json({ subCities: rows });
});

// POST /api/sub-cities — create a new sub-city
app.post('/api/sub-cities', (req, res) => {
  const { parentCityName, subCityName, description = '' } = req.body;
  if (!parentCityName || !subCityName) {
    return res.status(400).json({ error: 'parentCityName and subCityName required' });
  }
  try {
    db.prepare(`
      INSERT OR IGNORE INTO sub_cities (parent_city_name, sub_city_name, description, created_at)
      VALUES (?, ?, ?, ?)
    `).run(parentCityName, subCityName, description, new Date().toISOString());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/photos/:cityName
app.get('/api/photos/:cityName', (req, res) => {
  const photos = db.prepare(`
    SELECT filename, original_name AS originalName, url, uploaded_at AS uploadedAt,
           is_preview AS isPreview, featured_order AS featuredOrder,
           taken_at AS takenAt
    FROM photos WHERE city_name = ? ORDER BY id ASC
  `).all(req.params.cityName);
  res.json({ photos });
});

// PATCH /api/photos/:cityName/:filename — set preview / featured order
app.patch('/api/photos/:cityName/:filename', (req, res) => {
  const { cityName, filename } = req.params;
  const { isPreview, featuredOrder } = req.body;

  const photo = db.prepare('SELECT id FROM photos WHERE city_name = ? AND filename = ?')
    .get(cityName, filename);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  if (isPreview === true) {
    db.prepare('UPDATE photos SET is_preview = 0 WHERE city_name = ?').run(cityName);
    db.prepare('UPDATE photos SET is_preview = 1 WHERE city_name = ? AND filename = ?').run(cityName, filename);
  } else if (isPreview === false) {
    db.prepare('UPDATE photos SET is_preview = 0 WHERE city_name = ? AND filename = ?').run(cityName, filename);
  }

  if (featuredOrder !== undefined) {
    if (featuredOrder === null) {
      db.prepare('UPDATE photos SET featured_order = NULL WHERE city_name = ? AND filename = ?').run(cityName, filename);
    } else {
      // Evict any other photo that holds this slot
      db.prepare('UPDATE photos SET featured_order = NULL WHERE city_name = ? AND featured_order = ?').run(cityName, featuredOrder);
      db.prepare('UPDATE photos SET featured_order = ? WHERE city_name = ? AND filename = ?').run(featuredOrder, cityName, filename);
    }
  }

  res.json({ success: true });
});

// POST /api/photos/:cityName
app.post('/api/photos/:cityName', upload.array('photos', 100), async (req, res) => {
  const cityName = req.params.cityName;
  const insert = db.prepare(`
    INSERT INTO photos (city_name, filename, original_name, url, uploaded_at, taken_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const newPhotos = await Promise.all(req.files.map(async f => {
    const url = `/uploads/${cityName}/${f.filename}`;
    const uploadedAt = new Date().toISOString();
    const filePath = path.join(PHOTOS_DIR, cityName, f.filename);

    // Extract EXIF date (DateTimeOriginal preferred, fallback to DateTime)
    let takenAt = null;
    try {
      const exif = await exifr.parse(filePath, ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized']);
      const raw = exif?.DateTimeOriginal ?? exif?.DateTime ?? exif?.DateTimeDigitized ?? null;
      if (raw instanceof Date && !isNaN(raw.getTime())) takenAt = raw.toISOString();
    } catch { /* no EXIF — leave null */ }

    insert.run(cityName, f.filename, f.originalname, url, uploadedAt, takenAt);
    return { filename: f.filename, originalName: f.originalname, url, uploadedAt, takenAt };
  }));

  res.json({ success: true, photos: newPhotos });
});

// DELETE /api/photos/:cityName/:filename
app.delete('/api/photos/:cityName/:filename', (req, res) => {
  const { cityName, filename } = req.params;

  const photo = db.prepare('SELECT id FROM photos WHERE city_name = ? AND filename = ?')
    .get(cityName, filename);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filePath = path.join(PHOTOS_DIR, cityName, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM photos WHERE city_name = ? AND filename = ?').run(cityName, filename);
  res.json({ success: true });
});

// Backfill taken_at for photos uploaded before EXIF extraction was added
(async () => {
  const rows = db.prepare(
    `SELECT id, city_name, filename FROM photos WHERE taken_at IS NULL`
  ).all();

  if (!rows.length) return;
  console.log(`[exif-backfill] ${rows.length} photo(s) without taken_at — scanning…`);

  const update = db.prepare('UPDATE photos SET taken_at = ? WHERE id = ?');
  let filled = 0;

  for (const row of rows) {
    const filePath = path.join(PHOTOS_DIR, row.city_name, row.filename);
    if (!fs.existsSync(filePath)) continue;
    try {
      const exif = await exifr.parse(filePath, ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized']);
      const raw = exif?.DateTimeOriginal ?? exif?.DateTime ?? exif?.DateTimeDigitized ?? null;
      if (raw instanceof Date && !isNaN(raw.getTime())) {
        update.run(raw.toISOString(), row.id);
        filled++;
      }
    } catch { /* no EXIF in this file */ }
  }

  console.log(`[exif-backfill] done — ${filled}/${rows.length} dates recovered`);
})();

// Dev: Vite middleware (HMR inclus, même port)
if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Prod: serve built frontend
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT} (${isDev ? 'dev' : 'prod'})`);
});
