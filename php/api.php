<?php
/**
 * AdminFlow — PHP Backend API
 * ────────────────────────────────────────────────────────────────────────────
 * HOW TO USE:
 *   1. Configure your DB credentials in the CONFIG section below.
 *   2. Run setup.sql to create the database and tables.
 *   3. Place this file + setup.sql on any PHP server (XAMPP, Laragon, etc.)
 *   4. The frontend auto-detects this file and falls back to mock data if
 *      the backend is unavailable — so you can run HTML/CSS/JS standalone.
 *
 * ENDPOINTS  (GET ?action=...)
 *   dashboard  → KPI stats summary
 *   orders     → recent orders list
 *   products   → top products list
 *   users      → all users
 *   analytics  → traffic & chart data
 *
 * ENDPOINTS  (POST ?action=...)
 *   login      → authenticate user   { email, password }
 *   logout     → destroy session
 *   add_user   → create user         { name, email, role, password }
 *   edit_user  → update user         { id, name, email, role }
 *   delete_user→ remove user         { id }
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── CONFIG ────────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'adminflow');
define('DB_USER', 'root');
define('DB_PASS', '');           // Change to your MySQL password
define('SECRET',  'change_this_secret_key_in_production');

// ── BOOTSTRAP ─────────────────────────────────────────────────────────────────
session_start();

header('Content-Type: application/json');
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DATABASE CONNECTION ───────────────────────────────────────────────────────
function db(): PDO {
    static $pdo;
    if (!$pdo) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER, DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                 PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
            );
        } catch (PDOException $e) {
            respond(false, 'Database connection failed: ' . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function respond(bool $ok, $data = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'data' => $data, 'ts' => time()]);
    exit;
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function auth_required(): void {
    if (empty($_SESSION['user_id'])) respond(false, 'Unauthorized', 401);
}

function sanitize(string $s): string {
    return htmlspecialchars(strip_tags(trim($s)));
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    // ── GET: Dashboard KPIs ──────────────────────────────────────────────────
    case 'dashboard':
        auth_required();
        $db = db();
        $stats = [
            'revenue'     => (float) $db->query("SELECT COALESCE(SUM(amount),0) FROM orders WHERE MONTH(created_at)=MONTH(NOW())")->fetchColumn(),
            'active_users'=> (int)   $db->query("SELECT COUNT(*) FROM users WHERE status='active'")->fetchColumn(),
            'total_orders'=> (int)   $db->query("SELECT COUNT(*) FROM orders WHERE MONTH(created_at)=MONTH(NOW())")->fetchColumn(),
            'bounce_rate' => 38.2,   // Replace with real analytics integration
        ];
        respond(true, $stats);

    // ── GET: Recent Orders ───────────────────────────────────────────────────
    case 'orders':
        auth_required();
        $stmt = db()->query("
            SELECT o.id, u.name AS customer, o.product, o.amount, o.status,
                   DATE_FORMAT(o.created_at,'%b %d, %Y') AS date
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
            LIMIT 20
        ");
        respond(true, ['orders' => $stmt->fetchAll()]);

    // ── GET: Top Products ────────────────────────────────────────────────────
    case 'products':
        auth_required();
        $stmt = db()->query("
            SELECT product AS name,
                   COUNT(*) AS sales_count,
                   SUM(amount) AS revenue
            FROM orders
            GROUP BY product
            ORDER BY revenue DESC
            LIMIT 5
        ");
        respond(true, ['products' => $stmt->fetchAll()]);

    // ── GET: All Users ───────────────────────────────────────────────────────
    case 'users':
        auth_required();
        $stmt = db()->query("
            SELECT id, name, email, role, status,
                   DATE_FORMAT(created_at,'%b %d, %Y') AS joined
            FROM users
            ORDER BY created_at DESC
        ");
        respond(true, ['users' => $stmt->fetchAll()]);

    // ── GET: Analytics ───────────────────────────────────────────────────────
    case 'analytics':
        auth_required();
        $db = db();
        // Visitors per day (last 7 days)
        $visitors = $db->query("
            SELECT DATE_FORMAT(visited_at,'%a') AS label, COUNT(*) AS value
            FROM page_views
            WHERE visited_at >= CURDATE() - INTERVAL 6 DAY
            GROUP BY DATE(visited_at)
            ORDER BY DATE(visited_at)
        ")->fetchAll();
        respond(true, ['visitors' => $visitors]);

    // ── POST: Login ──────────────────────────────────────────────────────────
    case 'login':
        if ($method !== 'POST') respond(false, 'Method not allowed', 405);
        $body = json_body();
        $email    = sanitize($body['email']    ?? '');
        $password = $body['password'] ?? '';

        if (!$email || !$password) respond(false, 'Email and password are required', 422);

        $stmt = db()->prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            respond(false, 'Invalid credentials', 401);
        }

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];

        respond(true, [
            'id'   => $user['id'],
            'name' => $user['name'],
            'role' => $user['role'],
        ]);

    // ── POST: Logout ─────────────────────────────────────────────────────────
    case 'logout':
        session_destroy();
        respond(true, 'Logged out');

    // ── POST: Add User ───────────────────────────────────────────────────────
    case 'add_user':
        auth_required();
        if ($method !== 'POST') respond(false, 'Method not allowed', 405);
        $body     = json_body();
        $name     = sanitize($body['name']     ?? '');
        $email    = sanitize($body['email']    ?? '');
        $role     = sanitize($body['role']     ?? 'Viewer');
        $password = $body['password'] ?? 'changeme123';

        if (!$name || !$email) respond(false, 'Name and email are required', 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email', 422);

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = db()->prepare("INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,'active')");
        $stmt->execute([$name, $email, $role, $hash]);
        respond(true, ['id' => db()->lastInsertId()]);

    // ── POST: Edit User ──────────────────────────────────────────────────────
    case 'edit_user':
        auth_required();
        if ($method !== 'POST') respond(false, 'Method not allowed', 405);
        $body  = json_body();
        $id    = (int)  ($body['id']    ?? 0);
        $name  = sanitize($body['name']  ?? '');
        $email = sanitize($body['email'] ?? '');
        $role  = sanitize($body['role']  ?? '');

        if (!$id || !$name || !$email) respond(false, 'Missing fields', 422);

        $stmt = db()->prepare("UPDATE users SET name=?, email=?, role=? WHERE id=?");
        $stmt->execute([$name, $email, $role, $id]);
        respond(true, 'User updated');

    // ── POST: Delete User ────────────────────────────────────────────────────
    case 'delete_user':
        auth_required();
        if ($method !== 'POST') respond(false, 'Method not allowed', 405);
        $body = json_body();
        $id   = (int) ($body['id'] ?? 0);
        if (!$id) respond(false, 'User ID required', 422);

        db()->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        respond(true, 'User deleted');

    // ── 404 ──────────────────────────────────────────────────────────────────
    default:
        respond(false, 'Unknown action: ' . $action, 404);
}
