import express from "express";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);

const urlStore = new Map();
const reverseStore = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function generateCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/", (req, res) => {
  res.send(`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>URL Shortener</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; color: #222; }
    h1 { font-size: 22px; }
    form { display: flex; gap: 8px; margin: 24px 0; }
    input[type=url] { flex: 1; padding: 10px 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 6px; }
    button { padding: 10px 18px; font-size: 14px; border: 0; background: #333; color: #fff; border-radius: 6px; cursor: pointer; }
    button:hover { background: #555; }
    .result { padding: 12px; background: #f4f4f4; border-radius: 6px; word-break: break-all; }
    .error { color: #c00; }
    a { color: #06c; }
  </style>
</head>
<body>
  <h1>URL Shortener</h1>
  <form id="f">
    <input type="url" id="url" placeholder="https://example.com/very/long/url" required />
    <button type="submit">短縮</button>
  </form>
  <div id="out"></div>
  <script>
    const f = document.getElementById("f");
    const out = document.getElementById("out");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = document.getElementById("url").value;
      out.innerHTML = "";
      const r = await fetch("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) {
        out.innerHTML = '<div class="result error">' + (data.error || "エラー") + '</div>';
        return;
      }
      out.innerHTML = '<div class="result">短縮URL: <a href="' + data.shortUrl + '" target="_blank">' + data.shortUrl + '</a></div>';
    });
  </script>
</body>
</html>`);
});

app.post("/shorten", (req, res) => {
  const { url } = req.body || {};
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "有効なURL（http/https）を指定してください" });
  }

  if (reverseStore.has(url)) {
    const existing = reverseStore.get(url);
    return res.json({ code: existing, shortUrl: `${req.protocol}://${req.get("host")}/${existing}` });
  }

  let code;
  do {
    code = generateCode();
  } while (urlStore.has(code));

  urlStore.set(code, url);
  reverseStore.set(url, code);
  res.json({ code, shortUrl: `${req.protocol}://${req.get("host")}/${code}` });
});

app.get("/:code", (req, res) => {
  const url = urlStore.get(req.params.code);
  if (!url) return res.status(404).send("Not Found");
  res.redirect(url);
});

app.listen(PORT, () => {
  console.log(`URL shortener listening on http://localhost:${PORT}`);
});
