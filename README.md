# بگویار (BegooYar)

**Anonymous Message Sharing Platform**

A minimalist, Persian-first anonymous messaging app.

---

## 🌟 Features

- **Totally Anonymous Posting** - No accounts, just vibes
- **Replies & Threading** - Real conversation energy
- **Live Search** + **Date Filtering**
- **View Counter** on messages
- **Smart Censorship** - Blocks toxicity (terrorism, slurs, etc.)
- **Beautiful Glassmorphism UI** - Dark/Light toggle with custom favicon
- **Infinite Scroll** + Load More
- **Rate Limiting** - No spam, eh?
- **Mobile Responsive** - Works smooth on your phone

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (custom glass design), JavaScript (BegooYar class)
- **Backend**: Node.js + built-in HTTP server
- **Database**: Simple but powerful `messages.json` with in-memory indexes (fast af)
- **Fonts**: IRANSansX (proper Persian support)
- **No bloat** - Zero frameworks, pure power

---

## 📂 Project Structure

```bash
begoo_yar/
├── public/
│   ├── index.html
│   ├── style.css          # Glassmorphism magic
│   ├── app.js             # Main frontend logic
│   └── fonts/             # IRANSansX
├── server/
│   ├── server.js          # HTTP + API
│   ├── database.js        # JSON DB with indexes
│   ├── messages.json      # Your data lives here
│   └── forbidden.json     # Censorship list
├── package.json
└── export_project.py.py   # Fancy exporter you used
```

---

## 🚀 Quick Start

```bash
# 1. Clone or go to project folder
cd begooyar

# 2. Install (if you add more deps later)
npm install

# 3. Run it
npm run dev
# or
node server/server.js
```

Open http://localhost:8000 and done. Simple as that, buddy.

---

## 📡 API Endpoints

- GET /api/messages - Latest messages (paginated)
- POST /api/message - Post new message
- POST /api/reply - Reply to message
- GET /api/search?q=... - Search
- GET /api/date?day=YYYY-MM-DD - Filter by date
- POST /api/view - Increment view count

---

## 🎨 Design Philosophy

Clean. Glass. Persian-first. Built like a Jedi lightsaber - elegant, focused, and powerful. Dark mode feels like Mustafar at night, light mode like a snowy Toronto morning 🍁

---

## 🔒 Security & Moderation

- **Rate limiting** (3s cooldown)
- **XSS protection**
- **Forbidden words auto-censor**
- **JSON file DB** (easy backup & restore)

---

## 🚧 Future Ideas

- Add user-flagging system
- Image upload (with limits)
- Export messages as PDF
- Docker support
- Migrate to a real database (MongoDB/PostgreSQL) when scaling

---

Made with ❤️ in 2026
For the people who just wanna speak freely.
