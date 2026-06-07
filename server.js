const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.options("*", cors());
app.use(express.json());

// POST /api/anthropic — proxy to Anthropic Messages API
app.post("/api/anthropic", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(400).json({ error: "Missing x-api-key header" });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(400).json({ error: "Missing Authorization header" });
  }
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
        headers: { Authorization: authHeader },
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
