BTPGo Frontend - o2switch Deployment Guide

1) Prérequis
- Domaine pointé sur o2switch (A/AAAA) avec SSL (AutoSSL/Let's Encrypt) activé.
- API publique: https://api.msmarrakech.com (Fly.io) opérationnelle.

2) Ce que contient ce ZIP
- Le build prêt à déployer du frontend (répertoire dist/)
- Cette notice (README_o2switch.txt)
- Le build a été ajusté pour appeler l’API: https://api.msmarrakech.com

3) Déploiement via cPanel (fichier manager)
- Connectez-vous au cPanel o2switch
- Ouvrez Gestionnaire de fichiers → public_html/
- Téléversez btpgo-frontend-o2switch.zip
- Cliquez droit → Extraire (Extract) dans public_html/
- Vérifiez que public_html/ contient index.html et le dossier assets/

4) Déploiement via SFTP
- Hôte: votre serveur o2switch
- Répertoire distant: public_html/
- Transférez l’intégralité de dist/ (contenu) dans public_html/

5) Cache et performances
- Activez la compression (gzip/brotli) côté o2switch si disponible
- Si un CDN est utilisé, purgez le cache après mise à jour

6) Vérifications
- Ouvrez https://msmarrakech.com → la page s’affiche
- Ouvrez les outils développeur → Réseau → vérifiez que les requêtes vont vers https://api.msmarrakech.com
- L’API d’état répond sur https://api.msmarrakech.com/health

7) Rebuild (optionnel)
- Si vous devez recompiler le frontend:
  cd frontend
  VITE_BACKEND_URL=https://api.msmarrakech.com npm run build
- Puis générez à nouveau l’archive à déployer

Support: consignez tout message d’erreur observé (réseau/console) pour accélérer le diagnostic.
