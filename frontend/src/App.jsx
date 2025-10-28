import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:4000/")
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <h1 className="text-3xl font-bold mb-4">🚀 BTPGo Frontend Running</h1>
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>Chargement...</p>}
    </div>
  );
}

export default App;
