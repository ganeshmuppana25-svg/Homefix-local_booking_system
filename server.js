const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_DIR = path.join(__dirname, 'data');

/* ---------- Data persistence helpers ---------- */

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function readJson(name) {
  const raw = fs.readFileSync(filePath(name), 'utf8');
  return JSON.parse(raw);
}

function writeJson(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

let users;
let providers;
let services;
let bookings;

function saveUsers() { writeJson('users.json', users); }
function saveBookings() { writeJson('bookings.json', bookings); }
function saveServices() { writeJson('services.json', services); }
function saveProviders() { writeJson('providers.json', providers); }

try {
  users = readJson('users.json');
  providers = readJson('providers.json');
  services = readJson('services.json');
  bookings = readJson('bookings.json');
} catch (e) {
  // Seed minimal defaults if data files are absent.
  const h = bcrypt.hashSync('password', 10);
  services = [];
  providers = [];
  bookings = [];
  users = [{ id: 1, fullName: 'System Admin', email: 'admin@homefix.com', password: h, role: 'ADMIN', createdAt: new Date().toISOString() }];
  saveUsers();
  saveProviders();
  saveServices();
  saveBookings();
}

/* ---------- Middleware ---------- */

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'homefix-demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
}));

// Helper to strip passwords before returning over the API.
function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in to continue.' });
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this.' });
    }
    next();
  };
}

function nextId(arr) {
  return arr.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function findService(name) {
  return services.find((s) => s.name.toLowerCase() === String(name).toLowerCase());
}

function findProvider(id) {
  return providers.find((p) => Number(p.id) === Number(id));
}

function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

/* =========================================================
   AUTH ROUTES
   ========================================================= */

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in.' });
  const full = users.find((u) => u.id === req.session.user.id);
  return res.json({ user: sanitize(full || req.session.user), isAuthenticated: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password, role } = req.body || {};

  if (!fullName || !String(fullName).trim()) return res.status(400).json({ error: 'Full name is required.' });
  if (!/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email || '')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const finalRole = ['CUSTOMER', 'PROVIDER'].includes(role) ? role : 'CUSTOMER';

  if (findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = await bcrypt.hash(String(password), 10);
  const newUser = {
    id: nextId(users),
    fullName: String(fullName).trim(),
    email: String(email).trim().toLowerCase(),
    password: hash,
    role: finalRole,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers();

  req.session.user = { id: newUser.id, fullName: newUser.fullName, email: newUser.email, role: newUser.role };
  return res.status(201).json({ message: 'Account created successfully.', user: sanitize(newUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = findUserByEmail(email);
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.user = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  return res.json({ message: 'Login successful.', user: sanitize(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ message: 'You have been logged out.' });
  });
});

/* =========================================================
   PUBLIC ROUTES
   ========================================================= */

app.get('/api/services', (req, res) => {
  return res.json({ services });
});

app.get('/api/providers', (req, res) => {
  return res.json({ providers });
});

app.get('/api/providers/:id', (req, res) => {
  const provider = findProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found.' });
  return res.json({ provider });
});

/* =========================================================
   BOOKINGS (authenticated)
   ========================================================= */

// GET /api/bookings returns bookings relevant to the logged-in user.
app.get('/api/bookings', requireAuth, (req, res) => {
  const me = req.session.user;
  let mine = bookings;
  if (me.role === 'CUSTOMER') {
    mine = bookings.filter((b) => b.customerId === me.id);
  } else if (me.role === 'PROVIDER') {
    const prov = users.find((u) => u.id === me.id);
    const pid = prov && prov.providerId;
    mine = bookings.filter((b) => b.providerId === pid);
  }
  // ADMIN sees all bookings.
  return res.json({ bookings: mine });
});

function genBookingId() {
  const maxId = bookings.reduce((m, b) => Math.max(m, Number(b.id) || 0), 0) + 1;
  return 'HF-' + (1000 + maxId);
}

app.post('/api/bookings', requireAuth, (req, res) => {
  const me = req.session.user;
  if (me.role !== 'CUSTOMER' && me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only customers can create bookings.' });
  }

  const { providerId, service, date, time, address, notes } = req.body || {};

  const provider = findProvider(providerId);
  if (!provider) return res.status(400).json({ error: 'Please select a valid provider.' });

  // Resolve service name to the one listed on the provider if possible.
  const serviceName = findService(service) ? service : provider.service;

  if (!date || !time || !address || !String(address).trim()) {
    return res.status(400).json({ error: 'Service, date, time and address are required.' });
  }

  const customer = users.find((u) => u.id === me.id) || me;

  const booking = {
    id: nextId(bookings),
    bookingId: genBookingId(),
    customerId: me.id,
    providerId: provider.id,
    service: String(serviceName),
    providerName: provider.name,
    customerName: customer.fullName || me.fullName,
    date: String(date),
    time: String(time),
    address: String(address).trim(),
    notes: String(notes || '').trim(),
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  bookings.push(booking);
  saveBookings();

  return res.status(201).json({ message: 'Booking created successfully.', booking });
});

app.put('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  const me = req.session.user;
  const { action, status, notes } = req.body || {};

  const own = me.role === 'CUSTOMER' && booking.customerId === me.id;
  const ownReceived = me.role === 'PROVIDER' && isProviderOwner(me, booking);
  const isAdmin = me.role === 'ADMIN';

  if (!own && !ownReceived && !isAdmin) {
    return res.status(403).json({ error: 'You are not allowed to modify this booking.' });
  }

  // Cancel (customer or admin).
  if (action === 'cancel') {
    if (me.role === 'CUSTOMER' && !own) return res.status(403).json({ error: 'You cannot cancel this booking.' });
    if (me.role === 'PROVIDER') return res.status(403).json({ error: 'Only the customer or admin can cancel a booking.' });
    if (!['Pending', 'Confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'This booking cannot be cancelled at its current stage.' });
    }
    booking.status = 'Cancelled';
    saveBookings();
    return res.json({ booking, message: 'Booking cancelled.' });
  }

  // Status updates (provider or admin).
  const allowed = ['Pending', 'Confirmed', 'Rejected', 'In Progress', 'Completed', 'Cancelled'];
  if (status && allowed.includes(status)) {
    if (!ownReceived && !isAdmin) {
      return res.status(403).json({ error: 'Only the assigned provider or an admin can change booking status.' });
    }
    booking.status = status;
    saveBookings();
    return res.json({ booking, message: 'Booking status updated.' });
  }

  // Note edits (customer-owner or admin).
  if (notes !== undefined && (own || isAdmin)) {
    booking.notes = String(notes);
    saveBookings();
    return res.json({ booking, message: 'Booking updated.' });
  }

  return res.status(400).json({ error: 'No valid update provided.' });
});

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const idx = bookings.findIndex((b) => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Booking not found.' });

  const booking = bookings[idx];
  const me = req.session.user;
  const own = me.role === 'CUSTOMER' && booking.customerId === me.id;
  if (!own && me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'You are not allowed to delete this booking.' });
  }
  bookings.splice(idx, 1);
  saveBookings();
  return res.json({ message: 'Booking deleted.' });
});

function isProviderOwner(me, booking) {
  const prov = users.find((u) => u.id === me.id);
  return prov && prov.providerId === booking.providerId;
}

/* =========================================================
   ADMIN ROUTES (protected)
   ========================================================= */

app.get('/api/admin/stats', requireRole('ADMIN'), (req, res) => {
  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  return res.json({
    totalUsers: users.length,
    totalProviders: providers.length,
    totalServices: services.length,
    totalBookings: bookings.length,
    pendingBookings: statusCounts['Pending'] || 0,
    completedBookings: statusCounts['Completed'] || 0,
    customers: users.filter((u) => u.role === 'CUSTOMER').length,
    providerAccounts: users.filter((u) => u.role === 'PROVIDER').length
  });
});

app.get('/api/admin/users', requireRole('ADMIN'), (req, res) => {
  return res.json({ users: users.map(sanitize) });
});

app.get('/api/admin/providers', requireRole('ADMIN'), (req, res) => {
  return res.json({ providers });
});

app.get('/api/admin/services', requireRole('ADMIN'), (req, res) => {
  return res.json({ services });
});

app.get('/api/admin/bookings', requireRole('ADMIN'), (req, res) => {
  return res.json({ bookings });
});

app.delete('/api/admin/users/:id', requireRole('ADMIN'), (req, res) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  const target = users[idx];
  if (Number(target.id) === req.session.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  users.splice(idx, 1);
  saveUsers();
  return res.json({ message: 'User deleted.' });
});

app.delete('/api/admin/providers/:id', requireRole('ADMIN'), (req, res) => {
  const idx = providers.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Provider not found.' });
  providers.splice(idx, 1);
  saveProviders();
  return res.json({ message: 'Provider removed.' });
});

app.delete('/api/admin/services/:id', requireRole('ADMIN'), (req, res) => {
  const idx = services.findIndex((s) => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Service not found.' });
  services.splice(idx, 1);
  saveServices();
  return res.json({ message: 'Service removed.' });
});

app.post('/api/admin/services', requireRole('ADMIN'), (req, res) => {
  const { name, description, startingPrice, icon, category } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Service name is required.' });
  const newService = {
    id: nextId(services),
    name: String(name).trim(),
    icon: icon || 'maintenance',
    description: String(description || ''),
    startingPrice: Number(startingPrice) || 0,
    category: String(category || name).trim()
  };
  services.push(newService);
  saveServices();
  return res.status(201).json({ message: 'Service added.', service: newService });
});

/* ---------- API 404 for unmatched /api routes ---------- */
app.use('/api', (req, res) => {
  return res.status(404).json({ error: 'API endpoint not found.' });
});

/* ---------- Central error handler ---------- */
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
});

// SPA fallback: serve index.html for any non-API GET.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HomeFix running on port ${PORT}`);
});