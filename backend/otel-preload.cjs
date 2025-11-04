(async () => {
  try {
    await import('./otel.js');
  } catch (e) {
    try {
      console.warn('OTEL preload failed:', e?.message || String(e));
    } catch {}
  }
})();

