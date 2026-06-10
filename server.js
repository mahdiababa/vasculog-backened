const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.options("*", cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const OPENAI_KEY = process.env.OPENAI_KEY;

// POST /api/anthropic — proxy to Anthropic Messages API
app.post("/api/anthropic", async (req, res) => {
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    res.status(502).json({ error: "Upstream request failed" });
  }
});

// POST /api/openai-transcribe — proxy to OpenAI Whisper API
app.post("/api/openai-transcribe", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing audio file" });
  }
  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname || "audio.webm"
    );
    form.append("model", req.body.model || "whisper-1");
    const upstream = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("OpenAI transcribe error:", err);
    res.status(502).json({ error: "Upstream request failed" });
  }
});

// POST /api/sheets-sync — proxy to Google Apps Script
app.post("/api/sheets-sync", async (req, res) => {
  try {
    const sheetsUrl = process.env.SHEETS_URL;
    const upstream = await fetch(sheetsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Sheets sync error:", err);
    res.status(502).json({ error: "Sheets sync failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
