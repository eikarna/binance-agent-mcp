import http.server
import socketserver
import os

PORT = 8765
DIRECTORY = "video_ui"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

os.chdir("C:/Users/Administrator/Documents/binance-agent-mcp")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
