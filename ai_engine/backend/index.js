import "./otel.js";
import app from "./src/app.js";

// ✅ Fly.io listen fix
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`✅ BTPGo Backend is now running on http://$HOST:$PORT`);
  // Prevent duplicate listen calls
  return;
});

