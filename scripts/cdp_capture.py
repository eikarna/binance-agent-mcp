import json
import urllib.request
import os
import time
import base64
import asyncio
import websockets

async def capture():
    req = urllib.request.urlopen("http://127.0.0.1:9222/json", timeout=5)
    tabs = json.loads(req.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        html_url = "file:///" + os.path.abspath("demo-preview.html").replace("\\", "/")
        await ws.send(json.dumps({"id": 1, "method": "Page.navigate", "params": {"url": html_url}}))
        await asyncio.sleep(6)

        await ws.send(json.dumps({
            "id": 2,
            "method": "Emulation.setDeviceMetricsOverride",
            "params": {"width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False}
        }))

        await ws.send(json.dumps({"id": 3, "method": "Page.captureScreenshot", "params": {"format": "png"}}))

        while True:
            msg = await ws.recv()
            res = json.loads(msg)
            if res.get("id") == 3:
                img_data = base64.b64decode(res["result"]["data"])
                os.makedirs("assets/screenshots", exist_ok=True)
                with open("assets/screenshots/dashboard_frame.png", "wb") as f:
                    f.write(img_data)
                print("Successfully saved assets/screenshots/dashboard_frame.png")
                break

asyncio.run(capture())
