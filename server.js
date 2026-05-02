import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createHttpServer } from 'http';
import Database from 'better-sqlite3';

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
  )
`);

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

// GET /api/photos/:cityName
app.get('/api/photos/:cityName', (req, res) => {
  const photos = db.prepare(`
    SELECT filename, original_name AS originalName, url, uploaded_at AS uploadedAt
    FROM photos WHERE city_name = ? ORDER BY id ASC
  `).all(req.params.cityName);
  res.json({ photos });
});

// POST /api/photos/:cityName
app.post('/api/photos/:cityName', upload.array('photos', 5), (req, res) => {
  const cityName = req.params.cityName;
  const insert = db.prepare(`
    INSERT INTO photos (city_name, filename, original_name, url, uploaded_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const newPhotos = req.files.map(f => {
    const url = `/uploads/${cityName}/${f.filename}`;
    const uploadedAt = new Date().toISOString();
    insert.run(cityName, f.filename, f.originalname, url, uploadedAt);
    return { filename: f.filename, originalName: f.originalname, url, uploadedAt };
  });

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
