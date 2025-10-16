require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'brightstar_secret_key',
  resave: false,
  saveUninitialized: false
}));

const USERS_FILE = './data/users.json';
const UNITS_FILE = './data/units.json';

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([
  { "username": "admin", "email": "admin@example.com", "password": "$2a$10$E4QyZfYgC8xCQ.MrQx0T8OQ3cdL/8gXbYZ6aS.NiM3utVphXZuhVu" }
], null, 2));

if (!fs.existsSync(UNITS_FILE)) fs.writeFileSync(UNITS_FILE, JSON.stringify([
  { "id": 1, "title": "Unit A - Mirera Mastima", "location": "Naivasha", "size": "50x100", "price": 950000, "status": "Available", "image": "" }
], null, 2));

let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
let units = JSON.parse(fs.readFileSync(UNITS_FILE, 'utf8'));

// Nodemailer (uses env)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Helper: save units
function saveUnits() {
  fs.writeFileSync(UNITS_FILE, JSON.stringify(units, null, 2));
}

// AUTH: login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid username or password' });
  req.session.user = username;
  res.json({ message: 'Login successful' });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  next();
}

// PASSWORD RESET
let resetTokens = {};
app.post('/api/request-reset', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'Email not found' });
  const token = crypto.randomBytes(20).toString('hex');
  resetTokens[token] = { username: user.username, expires: Date.now() + 15*60*1000 };
  const resetLink = (process.env.BASE_URL || ('http://localhost:'+PORT)) + '/admin/reset_password.html?token=' + token;
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset - Brightstar',
    html: `<p>Hello ${user.username},</p><p>Use this link to reset your password (15 minutes): <a href="${resetLink}">${resetLink}</a></p>`
  }).catch(err => console.error('Mail error', err));
  res.json({ message: 'Reset email sent (if configured)' });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const data = resetTokens[token];
  if (!data || data.expires < Date.now()) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = users.find(u => u.username === data.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.password = await bcrypt.hash(newPassword, 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  delete resetTokens[token];
  res.json({ message: 'Password updated' });
});

// UNITS API
app.get('/api/units', (req, res) => res.json(units));

app.post('/api/add', requireAuth, (req, res) => {
  const unit = { id: Date.now(), ...req.body };
  units.push(unit);
  saveUnits();
  io.emit('unitsUpdated', units);
  res.json({ message: 'Unit added', unit });
});

app.post('/api/edit', requireAuth, (req, res) => {
  const { id } = req.body;
  const idx = units.findIndex(u => u.id == id);
  if (idx !== -1) {
    units[idx] = req.body;
    saveUnits();
    io.emit('unitsUpdated', units);
  }
  res.json({ message: 'Unit updated' });
});

app.post('/api/delete', requireAuth, (req, res) => {
  const { id } = req.body;
  units = units.filter(u => u.id != id);
  saveUnits();
  io.emit('unitsUpdated', units);
  res.json({ message: 'Unit deleted' });
});

io.on('connection', socket => {
  socket.emit('unitsUpdated', units);
});

server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
