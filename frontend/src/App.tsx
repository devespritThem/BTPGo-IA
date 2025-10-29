import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState('loading...');
  useEffect(() => {
    const url = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    fetch(url + '/health')
      .then(r => r.json())
      .then(d => setStatus(d?.ok ? 'backend: ok' : 'backend: fail'))
      .catch(() => setStatus('backend: unreachable'));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>BTPGo IA Suite</h1>
      <p>Status: {status}</p>
    </div>
  );
}

export default App;

