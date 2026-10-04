(() => {
  const hostname = window.location.hostname || '';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const port = window.location.port;
  const isLocalHost = (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.local')
  );

  let apiBaseUrl;

  if (isLocalHost) {
    if (typeof Storage !== 'undefined') {
      localStorage.removeItem('CONFIG');
      localStorage.removeItem('domianURL');
      localStorage.removeItem('API_BASE_URL');
      sessionStorage.removeItem('CONFIG');
      sessionStorage.removeItem('domianURL');
    }

    apiBaseUrl = 'http://127.0.0.1:8081';
  } else {
    const basePort = port && port !== '80' && port !== '443' ? `:${port}` : '';
    apiBaseUrl = `${protocol}//${hostname}${basePort}`;
  }

  const versionSuffix = isLocalHost ? 'local-dev' : 'prod';
  const configPayload = {
    domianURL: apiBaseUrl,
    staticDomainURL: apiBaseUrl,
    uploadDomain: apiBaseUrl,
    apiBaseUrl,
    version: `2.8.0-${versionSuffix}-${Date.now()}`
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
})();
