// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const JsonDatabase = require("./database");

const PORT = process.env.PORT || 8000;
const MESSAGES_FILE = path.join(__dirname, "messages.json");
const FORBIDDEN_FILE = path.join(__dirname, "forbidden.json");

// Initialize database
const db = new JsonDatabase(MESSAGES_FILE);

// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 3000;

// Forbidden words censorship (keep your existing functions)
function readForbiddenWords() {
  try {
    const data = fs.readFileSync(FORBIDDEN_FILE, "utf8");
    return JSON.parse(data).words || [];
  } catch (error) {
    return [];
  }
}

function normalizeWord(str) {
  return str.replace(/[\p{P}\p{S}]+/gu, "").toLowerCase();
}

function mask(clean) {
  const visibleCount = Math.max(2, Math.ceil(clean.length * 0.4));
  const hidden = clean.length - visibleCount;
  return clean.slice(0, visibleCount) + "*".repeat(hidden);
}

function censorText(text) {
  const forbidden = readForbiddenWords().map((w) => normalizeWord(w));

  return text.replace(/[\p{L}\p{N}\p{P}\p{S}]+/gu, (chunk) => {
    const cleaned = normalizeWord(chunk);
    if (!cleaned) return chunk;
    if (forbidden.includes(cleaned)) {
      return mask(cleaned);
    }
    return chunk;
  });
}

function checkRateLimit(ip) {
  const now = Date.now();
  const lastRequest = rateLimit.get(ip);
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return false;
  }
  rateLimit.set(ip, now);
  return true;
}

function cleanRateLimit() {
  const now = Date.now();
  for (const [ip, time] of rateLimit.entries()) {
    if (now - time > RATE_LIMIT_WINDOW * 10) {
      rateLimit.delete(ip);
    }
  }
}

setInterval(cleanRateLimit, RATE_LIMIT_WINDOW);

// Static file server
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(data);
  });
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const clientIP = req.socket.remoteAddress;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  if (req.url === "/" || req.url === "/index.html") {
    serveFile(res, path.join(__dirname, "../public/index.html"), "text/html");
    return;
  } else if (req.url === "/style.css") {
    serveFile(res, path.join(__dirname, "../public/style.css"), "text/css");
    return;
  } else if (req.url === "/app.js") {
    serveFile(
      res,
      path.join(__dirname, "../public/app.js"),
      "application/javascript"
    );
    return;
  } else if (req.url.startsWith("/fonts/")) {
    const fontPath = path.join(__dirname, "../public", req.url);
    const ext = path.extname(fontPath);
    const type =
      ext === ".woff2"
        ? "font/woff2"
        : ext === ".woff"
        ? "font/woff"
        : "application/octet-stream";
    serveFile(res, fontPath, type);
    return;
  }

  // API endpoints
  if (parsedUrl.pathname === "/api/messages") {
    handleGetMessages(req, res, parsedUrl);
  } else if (parsedUrl.pathname === "/api/message" && req.method === "POST") {
    handlePostMessage(req, res, clientIP);
  } else if (parsedUrl.pathname === "/api/reply" && req.method === "POST") {
    handlePostReply(req, res, clientIP);
  } else if (parsedUrl.pathname === "/api/search") {
    handleSearch(req, res, parsedUrl);
  } else if (parsedUrl.pathname === "/api/date") {
    handleDateFilter(req, res, parsedUrl);
  } else if (parsedUrl.pathname === "/api/view" && req.method === "POST") {
    handleIncrementView(req, res);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// API Handlers
function handleGetMessages(req, res, parsedUrl) {
  const query = parsedUrl.query || {};
  const offset = parseInt(query.offset) || 0;
  const limit = parseInt(query.limit) || 20;

  const messages = db.getMessages(offset, limit);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(messages));
}

function handlePostMessage(req, res, clientIP) {
  if (!checkRateLimit(clientIP)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "یکم صبر کن." }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const postData = JSON.parse(body);

      // Validation
      if (!postData.text || postData.text.trim() === "") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Message text required" }));
        return;
      }

      if (postData.text.length > 1000) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "پیامت طولانیه (حداکثر 1000 کاراکتر)" })
        );
        return;
      }

      const cleanText = postData.text.trim().replace(/<[^>]*>?/gm, "");
      const censoredText = censorText(cleanText);

      const newMessage = db.insertMessage({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: censoredText,
        author: postData.author ? postData.author.trim() : "ناشناس",
        timestamp: new Date().toISOString(),
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newMessage));
    } catch (error) {
      console.error("Post message error:", error);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}

function handlePostReply(req, res, clientIP) {
  if (!checkRateLimit(clientIP)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "یکم صبر کن مگه رباتی؟" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const replyData = JSON.parse(body);

      if (
        !replyData.messageId ||
        !replyData.text ||
        replyData.text.trim() === ""
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "متن پاسخ الزامی است" }));
        return;
      }

      if (replyData.text.length > 400) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "پاسخ خیلی طولانیه" }));
        return;
      }

      const cleanedText = replyData.text.trim().replace(/<[^>]*>?/gm, "");
      const censoredText = censorText(cleanedText);

      const newReply = db.insertReply(replyData.messageId, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: censoredText,
        author: replyData.author ? replyData.author.trim() : "ناشناس",
        timestamp: new Date().toISOString(),
      });

      if (!newReply) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "پیام پیدا نشد" }));
        return;
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newReply));
    } catch (error) {
      console.error("Post reply error:", error);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request" }));
    }
  });
}

function handleSearch(req, res, parsedUrl) {
  const query = parsedUrl.query.q || "";
  const offset = parseInt(parsedUrl.query.offset) || 0;
  const limit = parseInt(parsedUrl.query.limit) || 20;

  if (!query) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Search query is required" }));
    return;
  }

  const results = db.searchMessages(query, offset, limit);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(results));
}

function handleDateFilter(req, res, parsedUrl) {
  const dateStr = parsedUrl.query.day;
  const offset = parseInt(parsedUrl.query.offset) || 0;
  const limit = parseInt(parsedUrl.query.limit) || 20;

  if (!dateStr) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Date is required" }));
    return;
  }

  const results = db.getMessagesByDate(dateStr, offset, limit);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(results));
}

function handleIncrementView(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const { id } = JSON.parse(body);
      db.incrementViews(id);
      res.writeHead(200);
      res.end();
    } catch (error) {
      console.error(error);
      res.writeHead(400);
      res.end();
      return;
    }
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`♥ Server running at http://localhost:${PORT}`);
  console.log(`♦ Database: ${MESSAGES_FILE}`);
  console.log(`♣ Messages loaded: ${db.getMessageCount()}`);
  console.log(`♠ Database size: ${(db.getSize() / 1024).toFixed(2)} KB`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  db.saveSync();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
