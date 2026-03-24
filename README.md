# LinkPage — Personalized Mini Website Platform

A Linktree-style platform where you (the admin) create and manage mini websites for clients, each accessible at a unique URL with QR code support.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your login credentials
- `BASE_URL` — your domain (e.g. `https://yourdomain.com`)

### 3. Start MongoDB
Make sure MongoDB is running locally, or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### 4. (Optional) Seed sample data
```bash
node seed.js
```
This creates 3 sample clients: `/rohan`, `/sita`, `/ram`

### 5. Start the server
```bash
npm run dev        # development (auto-restarts with nodemon)
npm start          # production
```

Server runs at: **http://localhost:3000**

---

## Project Structure

```
linkpage/
├── server.js              ← Entry point
├── seed.js                ← Sample data seeder
├── .env                   ← Your config (never commit this)
├── .env.example           ← Template for .env
│
├── config/
│   ├── db.js              ← MongoDB connection
│   └── multer.js          ← Image upload config
│
├── middleware/
│   └── auth.js            ← JWT admin guard
│
├── models/
│   └── Client.js          ← MongoDB schema
│
├── routes/
│   ├── admin.js           ← Admin API (login, CRUD, QR)
│   └── client.js          ← Public /:username pages
│
├── views/
│   ├── 404.ejs
│   └── themes/
│       ├── minimal.ejs    ← Theme 1
│       ├── modern.ejs     ← Theme 2 (Phase 5)
│       └── business.ejs   ← Theme 3 (Phase 5)
│
├── public/
│   ├── css/themes/        ← Theme stylesheets
│   └── js/                ← Frontend scripts
│
├── admin/                 ← Admin dashboard HTML (Phase 4)
└── uploads/               ← Uploaded profile images
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Login, returns JWT token |

### Clients (all require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/clients` | List all clients |
| POST | `/admin/clients` | Create client |
| GET | `/admin/clients/:id` | Get one client |
| PUT | `/admin/clients/:id` | Update client |
| DELETE | `/admin/clients/:id` | Delete client |
| POST | `/admin/clients/:id/image` | Upload profile photo |
| GET | `/admin/clients/:id/qr` | Download QR code (PNG) |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:username` | Public client page |

---

## Testing the API (with curl)

```bash
# Login
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create a client (use token from login)
curl -X POST http://localhost:3000/admin/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","name":"Test User","bio":"Hello!","theme":"minimal"}'

# View the public page
open http://localhost:3000/test
```

---

## Next Phases
- **Phase 2** — Full MongoDB schema + model validation
- **Phase 3** — Complete backend routes
- **Phase 4** — Admin dashboard UI
- **Phase 5** — Modern & Business themes
- **Phase 6** — QR code generation & download