-- ============================================================
--  AdminFlow — Database Setup
--  Run this once to create your database & seed data
--  Usage: mysql -u root -p < setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS adminflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE adminflow;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('Super Admin','Admin','Editor','Viewer') DEFAULT 'Viewer',
  status      ENUM('active','inactive') DEFAULT 'active',
  avatar      VARCHAR(255)  DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  product     VARCHAR(100)  NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  status      ENUM('pending','shipped','completed','cancelled') DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── PAGE VIEWS (for analytics) ──────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  page        VARCHAR(200) NOT NULL,
  source      ENUM('organic','social','direct','email','referral') DEFAULT 'direct',
  visited_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── SEED: Admin user ────────────────────────────────────────
-- Default login: admin@adminflow.com / admin123
INSERT IGNORE INTO users (name, email, password, role, status) VALUES
  ('Alex Morgan',  'admin@adminflow.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin', 'active'),
  ('Sarah Kim',    'sarah@example.com',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin',       'active'),
  ('James Oliver', 'james@example.com',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Editor',      'active'),
  ('Mia Roberts',  'mia@example.com',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Viewer',      'inactive'),
  ('Leo Torres',   'leo@example.com',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Editor',      'active');

-- Note: all passwords above hash to "password" via bcrypt
-- The admin account uses "admin123" — replace hash before going live!

-- ── SEED: Sample orders ──────────────────────────────────────
INSERT INTO orders (user_id, product, amount, status, created_at) VALUES
  (2, 'Enterprise Plan', 499.00, 'completed', NOW() - INTERVAL 0 DAY),
  (3, 'Pro Plan',        129.00, 'pending',   NOW() - INTERVAL 1 DAY),
  (4, 'Basic Plan',       49.00, 'shipped',   NOW() - INTERVAL 2 DAY),
  (5, 'Pro Plan',        129.00, 'completed', NOW() - INTERVAL 3 DAY),
  (2, 'Add-ons Bundle',   79.00, 'cancelled', NOW() - INTERVAL 4 DAY),
  (3, 'Enterprise Plan', 499.00, 'completed', NOW() - INTERVAL 5 DAY),
  (4, 'Basic Plan',       49.00, 'pending',   NOW() - INTERVAL 6 DAY),
  (5, 'Pro Plan',        129.00, 'shipped',   NOW() - INTERVAL 7 DAY),
  (2, 'Enterprise Plan', 499.00, 'completed', NOW() - INTERVAL 10 DAY),
  (3, 'Add-ons Bundle',   79.00, 'completed', NOW() - INTERVAL 12 DAY);

-- ── SEED: Page views ─────────────────────────────────────────
INSERT INTO page_views (page, source, visited_at) VALUES
  ('/dashboard', 'organic', NOW() - INTERVAL 0 DAY),
  ('/dashboard', 'organic', NOW() - INTERVAL 0 DAY),
  ('/products',  'social',  NOW() - INTERVAL 1 DAY),
  ('/pricing',   'direct',  NOW() - INTERVAL 1 DAY),
  ('/pricing',   'email',   NOW() - INTERVAL 2 DAY),
  ('/blog',      'organic', NOW() - INTERVAL 2 DAY),
  ('/blog',      'social',  NOW() - INTERVAL 3 DAY),
  ('/dashboard', 'direct',  NOW() - INTERVAL 3 DAY),
  ('/contact',   'referral',NOW() - INTERVAL 4 DAY),
  ('/products',  'organic', NOW() - INTERVAL 5 DAY);

-- ── Done! ────────────────────────────────────────────────────
SELECT 'AdminFlow database created successfully!' AS status;
