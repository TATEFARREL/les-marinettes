(function () {
  if (navigator.doNotTrack === '1') return;

  var storageKey = 'lesmarinettes.visitor';
  var sessionId;
  try {
    sessionId = localStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(storageKey, sessionId);
    }
  } catch (_) {
    sessionId = crypto.randomUUID();
  }

  var payload = JSON.stringify({
    session_id: sessionId,
    path: window.location.pathname,
    referrer: document.referrer || null,
  });

  fetch('/api/analytics/page-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'omit',
  }).catch(function () {
    // Analytics must never interfere with the public website.
  });
})();
