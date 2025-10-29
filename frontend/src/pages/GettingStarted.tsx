export default function GettingStarted() {
  const api = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Getting Started</h2>
      <p>API cible: <a className="text-sky-600 underline" href={api + '/health'} target="_blank">{api}/health</a></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Production Backend (Fly.io): <a className="text-sky-600 underline" href="https://btpgo-backend.fly.dev/health" target="_blank">btpgo-backend.fly.dev/health</a></li>
        <li>Production Frontend (o2switch): <a className="text-sky-600 underline" href="https://www.msmarrakech.com/" target="_blank">www.msmarrakech.com</a></li>
      </ul>
      <div className="mt-4">
        <h3 className="text-xl font-medium">Config Frontend</h3>
        <p>Définir <code>VITE_API_URL</code> dans <code>.env</code> (ex: https://btpgo-backend.fly.dev).</p>
      </div>
      <div className="mt-4">
        <h3 className="text-xl font-medium">Liens utiles</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><a className="text-sky-600 underline" href="/" >Accueil</a></li>
          <li><a className="text-sky-600 underline" href="https://github.com/devespritThem/BTPGo-IA" target="_blank">Repo GitHub</a></li>
        </ul>
      </div>
    </div>
  );
}

