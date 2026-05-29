const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = __dirname;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const HAS_EXPLICIT_ADMIN_PASSWORD = Object.prototype.hasOwnProperty.call(process.env, "ADMIN_PASSWORD");
const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STATE_TABLE = process.env.SUPABASE_STATE_TABLE || "testcase_builder_state";
const SUPABASE_STATE_ID = process.env.SUPABASE_STATE_ID || "production";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

let writeQueue = Promise.resolve();

function hasSupabaseStorage() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}

function nowText() {
  return new Date().toLocaleString();
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSupabaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active !== false,
    createdAt: user.createdAt,
  };
}

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const candidate = hashPassword(password, parts[1]);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
}

function normalizeDb(db) {
  return {
    users: Array.isArray(db?.users) ? db.users : [],
    files: Array.isArray(db?.files) ? db.files : [],
    sessions: Array.isArray(db?.sessions) ? db.sessions : [],
  };
}

function safeDbPayload(db) {
  return normalizeDb(db);
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status}): ${text || response.statusText}`);
  }

  return response;
}

async function readDbFromSupabase() {
  const response = await supabaseRequest(
    `${SUPABASE_STATE_TABLE}?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=data`,
    { method: "GET" },
  );
  const rows = await response.json();
  return normalizeDb(rows?.[0]?.data);
}

async function writeDbToSupabase(db) {
  const payload = {
    id: SUPABASE_STATE_ID,
    data: safeDbPayload(db),
    updated_at: new Date().toISOString(),
  };
  await supabaseRequest(`${SUPABASE_STATE_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(payload),
  });
}

async function readDbFromFile() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return normalizeDb(JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { users: [], files: [], sessions: [] };
  }
}

async function writeDbToFile(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safeDb = safeDbPayload(db);
  writeQueue = writeQueue.then(() => fs.writeFile(DB_PATH, `${JSON.stringify(safeDb, null, 2)}\n`));
  return writeQueue;
}

async function readDb() {
  return hasSupabaseStorage() ? readDbFromSupabase() : readDbFromFile();
}

async function writeDb(db) {
  if (!hasSupabaseStorage()) return writeDbToFile(db);

  const safeDb = safeDbPayload(db);
  writeQueue = writeQueue.then(() => writeDbToSupabase(safeDb));
  return writeQueue;
}

async function ensureDefaultAdmin() {
  const db = await readDb();
  const username = normalizeUsername(DEFAULT_ADMIN_USERNAME);
  const existingAdmin = db.users.find((user) => normalizeUsername(user.username) === username);

  if (!existingAdmin) {
    db.users.unshift({
      id: makeId(),
      name: "Admin",
      username,
      role: "Admin",
      active: true,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      createdAt: nowText(),
    });
    await writeDb(db);
    return;
  }

  if (HAS_EXPLICIT_ADMIN_PASSWORD && !verifyPassword(DEFAULT_ADMIN_PASSWORD, existingAdmin.passwordHash)) {
    existingAdmin.passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD);
    existingAdmin.role = "Admin";
    existingAdmin.active = true;
    db.sessions = db.sessions.filter((session) => session.userId !== existingAdmin.id);
    await writeDb(db);
  }
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function sessionCookie(token, maxAge = SESSION_MAX_AGE_SECONDS) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `tb_session=${encodeURIComponent(token || "")}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

async function getRequestUser(request) {
  const token = parseCookies(request).tb_session;
  if (!token) return { db: await readDb(), user: null, token: "" };

  const db = await readDb();
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => Number(session.expiresAt) > now);
  const session = db.sessions.find((item) => item.token === token);
  const user = session ? db.users.find((item) => item.id === session.userId && item.active !== false) : null;
  return { db, user: user || null, token };
}

function canAccessFile(file, user) {
  if (!file || !user) return false;
  if (isAdmin(user)) return true;
  return Boolean(file.ownerUserId && file.ownerUserId === user.id);
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function requireUser(user) {
  if (!user) {
    const error = new Error("Authentication required.");
    error.statusCode = 401;
    throw error;
  }
}

function requireAdmin(user) {
  requireUser(user);
  if (!isAdmin(user)) {
    const error = new Error("Admin access required.");
    error.statusCode = 403;
    throw error;
  }
}

async function handleApi(request, response, url) {
  const { db, user, token } = await getRequestUser(request);
  const method = request.method || "GET";

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, storage: hasSupabaseStorage() ? "supabase" : "file" });
    return;
  }

  if (method === "GET" && url.pathname === "/api/session") {
    sendJson(response, 200, {
      user: publicUser(user),
      users: user && isAdmin(user) ? db.users.map(publicUser) : [],
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/login") {
    const body = await readJsonBody(request);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const loginUser = db.users.find((item) => normalizeUsername(item.username) === username && item.active !== false);
    if (!loginUser || !verifyPassword(password, loginUser.passwordHash)) {
      sendJson(response, 401, { error: "Invalid username or password." });
      return;
    }

    const nextToken = crypto.randomBytes(32).toString("hex");
    db.sessions.push({
      token: nextToken,
      userId: loginUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });
    await writeDb(db);
    sendJson(
      response,
      200,
      {
        user: publicUser(loginUser),
        users: isAdmin(loginUser) ? db.users.map(publicUser) : [],
      },
      { "Set-Cookie": sessionCookie(nextToken) },
    );
    return;
  }

  if (method === "POST" && url.pathname === "/api/logout") {
    db.sessions = db.sessions.filter((session) => session.token !== token);
    await writeDb(db);
    sendJson(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    return;
  }

  if (method === "GET" && url.pathname === "/api/users") {
    requireAdmin(user);
    sendJson(response, 200, { users: db.users.map(publicUser) });
    return;
  }

  if (method === "POST" && url.pathname === "/api/users") {
    requireAdmin(user);
    const body = await readJsonBody(request);
    const name = String(body.name || "").trim();
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const role = body.role === "Admin" ? "Admin" : "User";
    if (!name || !username || password.length < 4) {
      sendJson(response, 400, { error: "Name, username, and a password of at least 4 characters are required." });
      return;
    }
    if (db.users.some((item) => normalizeUsername(item.username) === username)) {
      sendJson(response, 409, { error: "That username already exists." });
      return;
    }

    const nextUser = {
      id: makeId(),
      name,
      username,
      role,
      active: true,
      passwordHash: hashPassword(password),
      createdAt: nowText(),
    };
    db.users.push(nextUser);
    await writeDb(db);
    sendJson(response, 201, { user: publicUser(nextUser), users: db.users.map(publicUser) });
    return;
  }

  const userDeleteMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (method === "DELETE" && userDeleteMatch) {
    requireAdmin(user);
    const userId = decodeURIComponent(userDeleteMatch[1]);
    const deleteUser = db.users.find((item) => item.id === userId);
    if (!deleteUser) {
      sendJson(response, 404, { error: "User not found." });
      return;
    }
    if (deleteUser.id === user.id) {
      sendJson(response, 400, { error: "You cannot delete your own signed-in admin account." });
      return;
    }
    const remainingAdmins = db.users.filter((item) => item.id !== userId && item.active !== false && isAdmin(item));
    if (isAdmin(deleteUser) && !remainingAdmins.length) {
      sendJson(response, 400, { error: "At least one active admin is required." });
      return;
    }
    db.users = db.users.filter((item) => item.id !== userId);
    db.files = db.files.filter((file) => file.ownerUserId !== userId);
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
    await writeDb(db);
    sendJson(response, 200, { users: db.users.map(publicUser) });
    return;
  }

  if (method === "GET" && url.pathname === "/api/files") {
    requireUser(user);
    const files = db.files
      .filter((file) => canAccessFile(file, user))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
    sendJson(response, 200, { files });
    return;
  }

  if (method === "POST" && url.pathname === "/api/files") {
    requireUser(user);
    const body = await readJsonBody(request);
    const incoming = body.file || body;
    const existing = incoming.id ? db.files.find((file) => file.id === incoming.id) : null;
    if (existing && !canAccessFile(existing, user)) {
      sendJson(response, 403, { error: "You cannot update this test case." });
      return;
    }

    const owner = existing || {
      ownerUserId: user.id,
      ownerName: user.name,
      ownerUsername: user.username,
      createdBy: { id: user.id, name: user.name, username: user.username },
      createdAt: nowText(),
    };
    const savedFile = {
      ...incoming,
      id: incoming.id || makeId(),
      name: String(incoming.name || "Test Case").trim() || "Test Case",
      createdAt: existing?.createdAt || incoming.createdAt || owner.createdAt || nowText(),
      updatedAt: nowText(),
      savedAt: Date.now(),
      ownerUserId: owner.ownerUserId || owner.createdBy?.id || user.id,
      ownerName: owner.ownerName || owner.createdBy?.name || user.name,
      ownerUsername: owner.ownerUsername || owner.createdBy?.username || user.username,
      createdBy: owner.createdBy || {
        id: owner.ownerUserId || user.id,
        name: owner.ownerName || user.name,
        username: owner.ownerUsername || user.username,
      },
      rowFormat: incoming.rowFormat || "each-step",
      columns: Array.isArray(incoming.columns) ? incoming.columns : [],
      rows: Array.isArray(incoming.rows) ? incoming.rows : [],
    };

    db.files = [savedFile, ...db.files.filter((file) => file.id !== savedFile.id)];
    await writeDb(db);
    sendJson(response, existing ? 200 : 201, { file: savedFile });
    return;
  }

  const fileDeleteMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
  if (method === "DELETE" && fileDeleteMatch) {
    requireUser(user);
    const fileId = decodeURIComponent(fileDeleteMatch[1]);
    const file = db.files.find((item) => item.id === fileId);
    if (!file) {
      sendJson(response, 404, { error: "Test case not found." });
      return;
    }
    if (!canAccessFile(file, user)) {
      sendJson(response, 403, { error: "You cannot delete this test case." });
      return;
    }
    db.files = db.files.filter((item) => item.id !== fileId);
    await writeDb(db);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const absolutePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));
  if (!absolutePath.startsWith(PUBLIC_DIR) || absolutePath.includes(`${path.sep}data${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const type = MIME_TYPES[extension] || "application/octet-stream";
    const headers = { "Content-Type": type };
    if ([".html", ".js", ".css"].includes(extension)) {
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
      headers.Pragma = "no-cache";
      headers.Expires = "0";
    }
    response.writeHead(200, headers);
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      const index = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[".html"],
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });
      response.end(index);
      return;
    }
    throw error;
  }
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error." });
  }
}

ensureDefaultAdmin()
  .then(() => {
    http.createServer(handleRequest).listen(PORT, HOST, () => {
      console.log(`Testcase Builder server running at http://${HOST}:${PORT}`);
      console.log(`Storage: ${hasSupabaseStorage() ? "Supabase" : DB_PATH}`);
      if (HAS_EXPLICIT_ADMIN_PASSWORD) {
        console.log(`Admin username: ${DEFAULT_ADMIN_USERNAME}`);
        console.log("Admin password loaded from ADMIN_PASSWORD.");
      } else {
        console.log(`Default admin: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`);
      }
    });
  })
  .catch((error) => {
    console.error("Unable to start server", error);
    process.exit(1);
  });
