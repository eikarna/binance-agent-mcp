import { writeFileSync } from "fs";

async function captureAll() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/version");
  const version = await versionRes.json();
  const browserWs = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve) => (browserWs.onopen = resolve));

  const scenes = ["scene1", "scene2", "scene3", "scene4"];

  for (const scene of scenes) {
    console.log(`Capturing ${scene}...`);

    const createTarget = () =>
      new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.id === id) {
            browserWs.removeEventListener("message", handler);
            resolve(msg.result.targetId);
          }
        };
        browserWs.addEventListener("message", handler);
        browserWs.send(
          JSON.stringify({
            id,
            method: "Target.createTarget",
            params: { url: `http://127.0.0.1:8765/${scene}.html` },
          })
        );
      });

    const targetId = await createTarget();

    const pageWs = new WebSocket(
      `ws://127.0.0.1:9222/devtools/page/${targetId}`
    );
    await new Promise((resolve) => (pageWs.onopen = resolve));

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.id === id) {
            pageWs.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        pageWs.addEventListener("message", handler);
        pageWs.send(JSON.stringify({ id, method, params }));
      });

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await new Promise((r) => setTimeout(r, 1200));

    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
    });

    const buffer = Buffer.from(screenshot.data, "base64");
    writeFileSync(`assets/frames/${scene}.png`, buffer);
    console.log(`Saved assets/frames/${scene}.png (${buffer.length} bytes)`);

    await new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      browserWs.send(
        JSON.stringify({
          id,
          method: "Target.closeTarget",
          params: { targetId },
        })
      );
      setTimeout(resolve, 300);
    });
  }

  console.log("All scenes captured successfully via CDP!");
  process.exit(0);
}

captureAll().catch(console.error);
