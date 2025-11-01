BTPGo Frontend - o2switch Deployment Guide

1) Prerequis
- Domaine pointe sur o2switch (A/AAAA) avec SSL (AutoSSL/Let's Encrypt) active.
- API publique: https://api.msmarrakech.com (Fly.io) operationnelle.

2) Contenu
- Le build pret a deployer du frontend (repertoire dist/)
- Cette notice (README_o2switch.txt)
- Le build a ete ajuste pour appeler l'API: https://api.msmarrakech.com

3) Deploiement via cPanel (file manager)
- Connectez-vous au cPanel o2switch
- Ouvrez Gestionnaire de fichiers -> public_html/
- Televersez btpgo-frontend-o2switch.zip
- Clic droit -> Extraire (Extract) dans public_html/
- Verifiez que public_html/ contient index.html et le dossier assets/

4) Deploiement via SFTP
- Hote: votre serveur o2switch
- Repertoire distant: public_html/
- Transferez l'integralite de dist/ (contenu) dans public_html/

5) Cache et performances
- Activez la compression (gzip/brotli) cote o2switch si disponible
- Si un CDN est utilise, purgez le cache apres mise a jour

6) Verifications
- Ouvrez https://msmarrakech.com -> la page s'affiche
- Outils developpeur -> Reseau -> verifiez que les requetes vont vers https://api.msmarrakech.com
- L'API d'etat repond sur https://api.msmarrakech.com/health

7) Rebuild (optionnel)
- Si vous devez recompiler le frontend:
  cd frontend
  VITE_API_URL=https://api.msmarrakech.com npm run build
- Puis generez a nouveau l'archive a deployer

Support: consignez tout message d'erreur observe (reseau/console) pour accelerer le diagnostic.

