import subprocess
import time
import os
import signal

output_video = os.path.join(os.environ['USERPROFILE'], 'Videos', 'binance_agent_demo.mp4')
os.makedirs(os.path.dirname(output_video), exist_ok=True)

print(f"[1/4] Starting screen recording to {output_video}...")
# Capture desktop via gdigrab
cmd = [
    'ffmpeg', '-y',
    '-f', 'gdigrab',
    '-framerate', '30',
    '-draw_mouse', '1',
    '-i', 'desktop',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    output_video
]

proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("[2/4] Recording started (PID:", proc.pid, ")")

time.sleep(2)

print("[3/4] Running Live Binance Agent OS Scenario in background...")
demo_cmd = ['bun', 'run', 'src/demo-mock.ts']
workdir = r'C:/Users/Administrator/Documents/binance-agent-mcp'
try:
    subprocess.run(demo_cmd, cwd=workdir, timeout=25)
except Exception as e:
    print("Demo finished or timed out:", e)

time.sleep(2)

print("[4/4] Finalizing video recording...")
try:
    proc.communicate(input=b'q\n', timeout=5)
except subprocess.TimeoutExpired:
    proc.terminate()
    proc.wait()

print("[DONE] Video generated successfully at:", output_video)
