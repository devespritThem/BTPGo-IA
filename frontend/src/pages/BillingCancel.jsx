export default function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 text-yellow-700 p-8">
      <div className="max-w-md w-full bg-white rounded shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Paiement annulé</h1>
        <p className="mb-4">La procédure de paiement a été annulée. Vous pouvez réessayer à tout moment.</p>
        <a className="text-blue-600 underline" href="/">Retour au tableau de bord</a>
      </div>
    </div>
  );
}

