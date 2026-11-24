
const http = require("node:http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.AGNES_API_KEY;
const MODEL = "agnes-video-2.5-flash";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const send = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.url === "/health" && req.method === "GET") {
    return send(200, { success: true, message: "Jason AI Video server is running" });
  }

  if (!API_KEY) {
    return send(500, { error: "AGNES_API_KEY is not configured" });
  }

  try {
    if (req.url === "/generate" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;

      const input = JSON.parse(body);
      const prompt = String(input.prompt || "").trim();
      const seconds = Number(input.seconds || 5);
      const allowedRatios = ["16:9", "9:16", "1:1"];
      const ratio = allowedRatios.includes(input.aspect_ratio)
        ? input.aspect_ratio
        : "9:16";

      if (!prompt) return send(400, { error: "Prompt is required" });
      if (seconds < 4 || seconds > 12) {
        return send(400, { error: "Duration must be between 4 and 12 seconds" });
      }

      const response = await fetch("https://apihub.agnes-ai.com/v1/videos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          mode: "text",
          seconds: String(seconds),
          size: "720P",
          aspect_ratio: ratio,
          n: 1
        })
      });

      const result = await response.json();
      return send(response.status, result);
    }

    if (req.url.startsWith("/status") && req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const videoId = url.searchParams.get("video_id");

      if (!videoId) return send(400, { error: "video_id is required" });

      const response = await fetch(
        `https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${MODEL}`,
        { headers: { "Authorization": `Bearer ${API_KEY}` } }
      );

      const result = await response.json();
      return send(response.status, result);
    }

    return send(404, { error: "Route not found" });
  } catch (error) {
    return send(500, { error: "Server error", details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Jason AI Video server running on port ${PORT}`);
});

