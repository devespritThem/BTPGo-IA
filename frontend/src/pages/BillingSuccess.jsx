export default function BillingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 text-green-700 p-8">
      <div className="max-w-md w-full bg-white rounded shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Paiement confirmé</h1>
        <p className="mb-4">Votre abonnement a été activé avec succès.</p>
        <a className="text-blue-600 underline" href="/">Retour au tableau de bord</a>
      </div>
    </div>
  );
}

