import asyncio
import json
import websockets
import urllib.request
import subprocess
import time
import os

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DEBUG_PORT = 9222
FRONTEND = "http://localhost:5173"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMmY2MDY0ZC0zMDM5LTQ5NDgtYWI2MC01MjNlNDhlYTYzNmMiLCJyb2xlIjoiZmluYW5jZV9leGVjdXRpdmUiLCJleHAiOjE3OTQwMDQ2MTksImlhdCI6MTc5NDAwMTAxOX0.xaR91Ok0WVoOk1mJrZZFHd7X2Gx2MJuGxezSRRNSGpw"
USER_OBJ = {"id": "d2f6064d-3039-4948-ab60-523e48ea636c", "email": "test@example.com", "full_name": "Test User", "role": "finance_executive"}

# Pages to capture: (name, path, width, height, collapsed)
PAGES = [
    ("dashboard-expanded", "/", 1366, 768, False),
    ("dashboard-collapsed", "/", 1366, 768, True),
    ("uploads-expanded", "/uploads", 1366, 768, False),
    ("uploads-collapsed", "/uploads", 1366, 768, True),
    ("reconciliation-expanded", "/reconciliation", 1366, 768, False),
    ("reconciliation-collapsed", "/reconciliation", 1366, 768, True),
    ("match-review-expanded", "/match-review", 1366, 768, False),
    ("match-review-collapsed", "/match-review", 1366, 768, True),
    ("dashboard-mobile", "/", 375, 812, False),
    ("uploads-mobile", "/uploads", 375, 812, False),
]

async def cdp_call(ws, method, params=None):
    """Send a CDP command and wait for response."""
    msg = {"id": 1, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == 1:
            return resp

async def cdp_event(ws, method_filter=None):
    """Wait for next CDP event."""
    while True:
        resp = json.loads(await ws.recv())
        if "method" in resp and (method_filter is None or resp["method"] == method_filter):
            return resp

async def capture_page(ws, name, path, width, height, collapsed):
    """Navigate to page, set auth, capture screenshot."""
    print(f"\n=== Capturing {name} ({width}x{height}, collapsed={collapsed}) ===")

    # Set viewport override BEFORE navigation so window.innerWidth reflects it on mount
    await cdp_call(ws, "Emulation.setDeviceMetricsOverride", {
        "width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 768
    })

    # Navigate to page
    await cdp_call(ws, "Page.navigate", {"url": FRONTEND + path})

    # Wait for page to load
    await asyncio.sleep(3)

    # Set localStorage auth token
    await cdp_call(ws, "Runtime.evaluate", {
        "expression": f"localStorage.setItem('reconiq_token', '{TOKEN}'); localStorage.setItem('reconiq_user', '{json.dumps(USER_OBJ)}'); console.log('Auth set');",
        "awaitPromise": True
    })

    # Reload to apply auth (viewport override persists across reload)
    await cdp_call(ws, "Page.reload", {})
    await asyncio.sleep(4)

    # Verify mobile detection worked
    if width < 768:
        check = await cdp_call(ws, "Runtime.evaluate", {
            "expression": "window.innerWidth + ' / ' + (localStorage.getItem('reconiq_token') ? 'authed' : 'no-token')",
            "awaitPromise": True
        })
        val = check.get('result', {}).get('result', {}).get('value', '?')
        print(f"  innerWidth after reload: {val}")

    # If collapsed, click the collapse button
    if collapsed:
        await cdp_call(ws, "Runtime.evaluate", {
            "expression": "document.querySelector('button[aria-label=\"Toggle navigation\"]')?.click() || document.querySelector('.rotate-180')?.click(); console.log('Collapse clicked');",
            "awaitPromise": True
        })
        await asyncio.sleep(2)

    # Capture screenshot
    result = await cdp_call(ws, "Page.captureScreenshot", {
        "format": "png",
        "quality": 90
    })

    data = result.get("result", {}).get("data", "")
    if data:
        import base64
        outpath = f"C:\\Users\\RAJDEEP\\AppData\\Local\\Temp\\opencode\\screenshot-{name}.png"
        with open(outpath, "wb") as f:
            f.write(base64.b64decode(data))
        print(f"Saved: {outpath}")

    await asyncio.sleep(1)

async def main():
    # Kill any existing Chrome
    os.system("taskkill /f /im chrome.exe >nul 2>&1")
    time.sleep(1)

    # Start Chrome with remote debugging
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-web-security",
        f"--remote-debugging-port={DEBUG_PORT}",
        FRONTEND + "/login"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("Chrome started, waiting for debugging port...")
    await asyncio.sleep(4)

    # Get list of targets
    try:
        targets = json.loads(urllib.request.urlopen(f"http://localhost:{DEBUG_PORT}/json").read())
    except Exception as e:
        print(f"Failed to get targets: {e}")
        return

    # Find the page target
    page_target = None
    for t in targets:
        if t.get("type") == "page":
            page_target = t
            break

    if not page_target:
        print("No page target found!")
        return

    devtools_ws_url = page_target["webSocketDebuggerUrl"]
    print(f"Connecting to: {devtools_ws_url}")

    async with websockets.connect(devtools_ws_url) as ws:
        # Enable domains
        await cdp_call(ws, "Runtime.enable")
        await cdp_call(ws, "Network.enable")
        await cdp_call(ws, "Page.enable")

        # Set up console error listener
        async def monitor_console():
            try:
                while True:
                    evt = await cdp_event(ws, "Runtime.consoleAPICalled")
                    args = evt.get("params", {}).get("args", [])
                    for arg in args:
                        if arg.get("type") == "string" and ("error" in arg.get("value", "").lower() or "warning" in arg.get("value", "").lower()):
                            print(f"CONSOLE [{arg.get('level', 'log')}]: {arg.get('value', '')[:200]}")
            except websockets.exceptions.ConnectionClosed:
                pass

        monitor_task = asyncio.create_task(monitor_console())

        # Capture all pages
        for name, path, width, height, collapsed in PAGES:
            await capture_page(ws, name, path, width, height, collapsed)

        monitor_task.cancel()

    # Cleanup
    chrome_proc.terminate()
    chrome_proc.wait()
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(main())
