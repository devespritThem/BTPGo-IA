export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold">BTPGo IA – Suite de gestion de chantiers</h1>
        <p className="mt-4 text-gray-600">Pilotez marchés, chantiers, documents, finances et RH, avec l’assistance IA intégrée.</p>
        <div className="mt-8 flex gap-3">
          <a href="/register" className="bg-blue-600 text-white px-5 py-3 rounded hover:bg-blue-700">Créer mon compte</a>
          <a href="/login" className="bg-gray-100 text-gray-800 px-5 py-3 rounded hover:bg-gray-200">Se connecter</a>
        </div>
      </section>
    </div>
  )
}

