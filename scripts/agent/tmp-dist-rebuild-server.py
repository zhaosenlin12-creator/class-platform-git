import http.server, socketserver, os
ROOT = r"D:\kaifa\class-platform\web\dist-rebuild-check"
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)
    def do_GET(self):
        path = self.path.split('?', 1)[0]
        full = os.path.join(ROOT, path.lstrip('/'))
        if path != '/' and os.path.exists(full) and not os.path.isdir(full):
            return super().do_GET()
        self.path = '/index.html'
        return super().do_GET()
with socketserver.TCPServer(('0.0.0.0', 8090), Handler) as httpd:
    print('dist-rebuild-check server on 8090', flush=True)
    httpd.serve_forever()
