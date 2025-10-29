import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[btpgo-backend] listening on http://localhost:${PORT}`);
});

