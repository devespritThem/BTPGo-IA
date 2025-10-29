Application mobile (PWA)

Fonctions
- Offline (cache via service worker / vite-plugin-pwa)
- QR Scan (BarcodeDetector natif)
- Notifications push (stockage subscriptions, envoi via VAPID à intégrer)

Backend
- Endpoint: `POST /push/subscribe` pour stocker l’abonnement
- Variables: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

Frontend
- Plugin: vite-plugin-pwa
- Fichier: `src/pwa.ts` (enregistrement SW)
- Page: `src/pages/ScanQR.tsx`

