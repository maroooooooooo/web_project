# AdminFlow — Admin Dashboard

A clean, light admin dashboard with HTML/CSS/JS frontend and PHP/MySQL backend.
The frontend runs **completely standalone** without needing PHP.

---

## Project Structure

```
admin-dashboard/
├── index.html              ← Main dashboard page
├── css/
│   └── style.css           ← All styles
├── js/
│   └── dashboard.js        ← Charts, data, interactivity
├── pages/
│   ├── login.html          ← Login page
│   ├── analytics.html      ← Analytics page
│   ├── users.html          ← Users management
│   ├── orders.html         ← Orders list
│   ├── settings.html       ← App settings
│   └── profile.html        ← User profile
└── php/
    ├── api.php             ← Full REST API (PHP 8+)
    └── setup.sql           ← Database schema + seed data
```

---

## Running the Frontend (No PHP needed)

Just open `index.html` in your browser — or serve with any static server:

```bash
# Python
python -m http.server 3000

# Node
npx serve .

# VS Code → Live Server extension → Right-click index.html → Open with Live Server
```

**Demo login:** `admin@adminflow.com` / `admin123`

The JS automatically falls back to mock data when the PHP backend is unavailable.

---

## Running with PHP Backend

### Requirements
- PHP 8.0+
- MySQL 5.7+ or MariaDB 10.4+
- XAMPP / Laragon / any PHP server

### Steps

1. **Create the database:**
   ```bash
   mysql -u root -p < php/setup.sql
   ```

2. **Configure credentials** in `php/api.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'adminflow');
   define('DB_USER', 'root');
   define('DB_PASS', 'your_password');
   ```

3. **Place the project** in your web server root:
   - XAMPP: `C:/xampp/htdocs/admin-dashboard/`
   - Laragon: `C:/laragon/www/admin-dashboard/`

4. Open `http://localhost/admin-dashboard/`

### API Endpoints

| Method | Action         | Description              |
|--------|---------------|--------------------------|
| GET    | `dashboard`   | KPI stats                |
| GET    | `orders`      | Recent orders            |
| GET    | `products`    | Top products             |
| GET    | `users`       | All users                |
| GET    | `analytics`   | Traffic data             |
| POST   | `login`       | Authenticate user        |
| POST   | `logout`      | End session              |
| POST   | `add_user`    | Create user              |
| POST   | `edit_user`   | Update user              |
| POST   | `delete_user` | Delete user              |

All endpoints return JSON: `{ success: bool, data: any, ts: number }`

### Example API Call
```javascript
// Login
const res = await fetch('php/api.php?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@adminflow.com', password: 'admin123' })
});
const data = await res.json();
// { success: true, data: { id, name, role } }
```

---

## Features

- **Dashboard** — KPI cards with animated counters, revenue chart, donut chart, orders table
- **Analytics** — Visitor trend, conversion bar chart, top pages table
- **Users** — List, search, filter by role, add user modal, delete
- **Orders** — Full list, filter by status, search, export
- **Settings** — Notifications toggles, theme, language, security, API key
- **Profile** — Edit info, avatar upload preview, activity log
- **Dark Mode** — Toggle & persists in localStorage
- **Responsive** — Mobile sidebar with overlay
- **Graceful fallback** — Works without backend using mock data

---

## Connecting Frontend → Backend

The API base URL is set in `js/dashboard.js`:

```javascript
const API_BASE = 'php/api.php';
```

Every fetch call wraps in a try/catch — if the PHP server is unreachable,
mock data is used silently. No errors shown to the user.
