import io
import mimetypes
import os
import posixpath
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = ROOT / 'web' / 'dist-rebuild-check'
UPSTREAM = 'http://127.0.0.1:8081'
HOST = '0.0.0.0'
PORT = 8091

DIRECT_PROXY_PREFIXES = (
    '/sys',
    '/api',
    '/teaching',
    '/uploads',
    '/health'
)

AMBIGUOUS_PREFIXES = (
    '/student',
    '/class',
    '/course',
    '/homework',
    '/teacher',
    '/classroom'
)


class DistProbeHandler(SimpleHTTPRequestHandler):
    def parsed_path(self):
        return urllib.parse.urlparse(self.path).path

    def is_document_request(self):
        accept = (self.headers.get('Accept') or '').lower()
        fetch_dest = (self.headers.get('Sec-Fetch-Dest') or '').lower()
        return self.command in {'GET', 'HEAD'} and (
            fetch_dest == 'document' or 'text/html' in accept
        )

    def should_proxy(self):
        path = self.parsed_path()

        if path.startswith(DIRECT_PROXY_PREFIXES):
            return True

        if path.startswith(AMBIGUOUS_PREFIXES):
            return not self.is_document_request()

        return False

    def translate_path(self, path):
        path = urllib.parse.urlparse(path).path
        path = posixpath.normpath(urllib.parse.unquote(path))
        words = [word for word in path.split('/') if word]
        full_path = str(DIST_DIR)
        for word in words:
            drive, word = os.path.splitdrive(word)
            head, word = os.path.split(word)
            if word in (os.curdir, os.pardir):
                continue
            full_path = os.path.join(full_path, word)
        return full_path

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_HEAD(self):
        if self.should_proxy():
            self.proxy_request()
            return
        super().do_HEAD()

    def do_GET(self):
        if self.parsed_path() == '/config.js':
            self.serve_probe_config()
            return
        if self.should_proxy():
            self.proxy_request()
            return
        super().do_GET()

    def do_POST(self):
        self.proxy_request()

    def do_PUT(self):
        self.proxy_request()

    def do_DELETE(self):
        self.proxy_request()

    def do_OPTIONS(self):
        self.proxy_request()

    def send_head(self):
        parsed = urllib.parse.urlparse(self.path)
        request_path = parsed.path or '/'
        translated = Path(self.translate_path(request_path))

        if translated.is_file():
            return self.serve_file(translated)

        if translated.is_dir():
            index = translated / 'index.html'
            if index.exists():
                return self.serve_file(index)

        index_file = DIST_DIR / 'index.html'
        return self.serve_file(index_file)

    def serve_file(self, file_path: Path):
        content_type = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
        stat = file_path.stat()
        file_obj = file_path.open('rb')
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(stat.st_size))
        self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
        self.end_headers()
        return file_obj

    def serve_probe_config(self):
        payload = """(() => {
  const apiBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const configPayload = {
    domianURL: apiBaseUrl,
    staticDomainURL: apiBaseUrl,
    uploadDomain: apiBaseUrl,
    apiBaseUrl,
    version: `2.8.0-probe-${Date.now()}`
  };

  window._CONFIG = {
    ...(window._CONFIG || {}),
    ...configPayload
  };

  if (typeof Storage !== 'undefined') {
    const serialized = JSON.stringify(window._CONFIG);
    localStorage.setItem('CONFIG', serialized);
    localStorage.setItem('domianURL', window._CONFIG.domianURL);
    sessionStorage.setItem('CONFIG', serialized);
    sessionStorage.setItem('domianURL', window._CONFIG.domianURL);
  }

  console.log('=== PROBE CONFIG LOADED ===', window._CONFIG);
})();"""
        encoded = payload.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def proxy_request(self):
        target_url = f'{UPSTREAM}{self.path}'
        body = None
        length = int(self.headers.get('Content-Length', '0') or '0')
        if length:
            body = self.rfile.read(length)

        headers = {}
        for key, value in self.headers.items():
            if key.lower() in {'host', 'content-length', 'connection', 'accept-encoding'}:
                continue
            headers[key] = value
        headers['Accept-Encoding'] = 'identity'

        request = urllib.request.Request(
            target_url,
            data=body,
            headers=headers,
            method=self.command
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() in {'transfer-encoding', 'connection', 'content-encoding', 'content-length'}:
                        continue
                    self.send_header(key, value)
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(payload)
        except urllib.error.HTTPError as error:
            payload = error.read()
            self.send_response(error.code)
            for key, value in error.headers.items():
                if key.lower() in {'transfer-encoding', 'connection', 'content-encoding', 'content-length'}:
                    continue
                self.send_header(key, value)
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(payload)
        except Exception as error:
            message = str(error).encode('utf-8', errors='replace')
            self.send_response(502)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(message)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(message)


def main():
    if not DIST_DIR.exists():
        raise SystemExit(f'Missing dist directory: {DIST_DIR}')
    server = ThreadingHTTPServer((HOST, PORT), DistProbeHandler)
    print(f'Serving {DIST_DIR} on http://{HOST}:{PORT} with upstream {UPSTREAM}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
