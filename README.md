# 🏠 HomeFix

**Reliable Local Services, Right at Your Doorstep**

HomeFix is a modern local service booking platform where customers can discover nearby
service professionals, view their profiles, and book services online. This is a polished
college/demo project built as a **single deployable Node.js/Express web service**.

---

## ✨ Features

- 🧭 Responsive navigation with Light/Dark mode toggle
- 🔍 Search & filter for services and providers (service, provider, location)
- 🛠️ 8 popular service categories with professional cards
- 👷 8 realistic demo providers with detailed profiles & reviews
- 🔐 Session-based authentication (Customer / Provider / Admin) with **bcrypt** password hashing
- 📅 Fully functional booking system with confirmation modal & statuses
- 👤 Customer dashboard (upcoming / previous bookings, cancel)
- 🧰 Provider dashboard (view, accept, reject & update bookings)
- 📊 Admin dashboard (statistics + manage users, providers, services, bookings)
- 🌙 Full dark mode with `localStorage` preference memory
- 📱 Fully responsive (desktop, tablet, mobile)
- 🔔 Toast notifications, loading / empty / error states
- 💾 JSON-file demo data (easy to modify)

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

The app will run on **http://localhost:5000** (or the `PORT` environment variable).

---

## 🔑 Demo Accounts

| Role     | Email               | Password |
|----------|---------------------|----------|
| Customer | customer@homefix.com | password |
| Provider | provider@homefix.com | password |
| Admin    | admin@homefix.com    | password |

> New accounts can also be registered directly from the Register page.

---

## 📁 Project Structure

```
HomeFix/
├── package.json
├── server.js
├── README.md
├── .gitignore
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── data/
    ├── users.json
    ├── providers.json
    ├── services.json
    └── bookings.json
```

---

## 🔌 API Endpoints

| Method | Endpoint                | Description                            |
|--------|-------------------------|----------------------------------------|
| GET    | `/api/services`         | List all services                      |
| GET    | `/api/providers`        | List all providers                     |
| GET    | `/api/providers/:id`    | Get a single provider by id            |
| GET    | `/api/bookings`         | List bookings (role-filtered)          |
| GET    | `/api/auth/me`          | Get current logged-in user             |
| POST   | `/api/auth/register`    | Register a new user                    |
| POST   | `/api/auth/login`       | Log in                                 |
| POST   | `/api/auth/logout`      | Log out                                |
| POST   | `/api/bookings`         | Create a booking                       |
| PUT    | `/api/bookings/:id`     | Update a booking (status / cancel)     |
| DELETE | `/api/bookings/:id`     | Delete a booking                       |

---

## ☁️ Deploy to Render (single Web Service)

- **Root Directory:** *(leave empty)*
- **Build Command:** `npm install`
- **Start Command:** `npm start`

The frontend and API are served from the **same URL** — no separate deployment needed.

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (never returned over the API)
- Session-based authentication with signed cookie
- Role-based authorization for dashboards & admin functions
- Request validation on registration / login / booking
- Booking IDs validated; users cannot modify other users' bookings
- Protected dashboard endpoints

---

Built with ❤️ using Node.js, Express, HTML, CSS & vanilla JavaScript.
