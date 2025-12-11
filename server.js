import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605 Safari/605",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537 Chrome/123",
];

function pickUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).json({ error: "Missing url" });

    const response = await fetch(target, {
      method: "GET",
      headers: {
        "user-agent": pickUA(),
        "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
        accept: "*/*",
        referer: "https://www.google.com/",
      }
    });

    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FAE-PROXY ÇALIŞIYOR → PORT ${PORT}`);
});
