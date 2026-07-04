// Génère deux vidéos webm distinctes (chaîne rouge / chaîne bleue) via Chromium.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = path.join(__dirname, "..", "public", "test-channels");

async function record(color, label, seconds) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c" width="320" height="240"></canvas>`);
  const b64 = await page.evaluate(
    async ({ color, label, seconds }) => {
      const canvas = document.getElementById("c");
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(25);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((r) => (rec.onstop = r));
      let frame = 0;
      const draw = () => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = "#fff";
        ctx.font = "28px sans-serif";
        ctx.fillText(`${label} ${frame++}`, 20, 130);
        if (rec.state === "recording") requestAnimationFrame(draw);
      };
      rec.start();
      draw();
      await new Promise((r) => setTimeout(r, seconds * 1000));
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: "video/webm" });
      const buf = await blob.arrayBuffer();
      let s = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s);
    },
    { color, label, seconds },
  );
  await browser.close();
  return Buffer.from(b64, "base64");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch1 = await record("#c81e1e", "CH1-ROUGE", 5);
  fs.writeFileSync(path.join(OUT, "ch1.webm"), ch1);
  console.log("ch1.webm", ch1.length, "octets");
  const ch2 = await record("#1e40c8", "CH2-BLEU", 5);
  fs.writeFileSync(path.join(OUT, "ch2.webm"), ch2);
  console.log("ch2.webm", ch2.length, "octets");
})();
