# Intégrer Supabase (PostgreSQL managé) à BTPGo-IA

Ce guide explique comment lier l'API backend (Prisma) à votre base Supabase en toute sécurité.

## 1) Récupérer l'URL de connexion Supabase

1. Ouvrez le Dashboard Supabase → Settings → Database → Connection strings.
2. Choisissez "Direct Connection" (port 5432), pas le pooler (6543) pour Prisma.
3. Copiez la chaîne:

```
postgresql://postgres:<MOT_DE_PASSE>@db.<PROJECT>.supabase.co:5432/postgres?sslmode=require
```

Remarques:
- Conservez `sslmode=require`.
- Si votre mot de passe contient des caractères spéciaux (`@`, `:`, `%`, `/`), encodez-les en URL (ex: `@` → `%40`).

## 2) Configurer la variable d'environnement

Dans le fichier `.env` à la racine du projet:

```
DATABASE_URL=postgresql://postgres:<MOT_DE_PASSE>@db.<PROJECT>.supabase.co:5432/postgres?sslmode=require
```

Ne commitez jamais ce fichier avec le mot de passe en clair. Utilisez des secrets en CI/CD.

## 3) Appliquer les migrations (one-shot)

Le service `migrations` du `docker-compose.yml` exécute Prisma `generate` + `migrate deploy`, puis lance le seed si `SEED=true`.

Exécutez:

```
docker compose run --rm migrations
```

Cela prépare le schéma (`User`, `Marche`, `Devis`, `Chantier`, `BackupCode`, `SecurityEvent`).

## 4) Démarrer l'application

```
docker compose up --build
```

Vérifications:
- Backend santé: http://localhost:4000/health
- Metrics: http://localhost:4000/metrics
- IA: http://localhost:8000/

## 5) Migrations au démarrage du backend (optionnel)

Par défaut, le backend applique aussi les migrations au démarrage (`MIGRATE_ON_START=true`).
Pour désactiver (recommandé en prod si vous utilisez le service `migrations`):

Dans `docker-compose.yml` → `services.backend.environment`:

```
MIGRATE_ON_START=false
```

## 6) Utilisation en CI/CD

- Ajoutez `DATABASE_URL` aux secrets GitHub Actions.
- Dans les workflows, exécutez `npx prisma migrate deploy` avant le déploiement.

## 7) Résolution de problèmes

- Erreur SSL: assurez-vous que l'URL inclut `?sslmode=require`.
- Prisma + pooler: utilisez la connexion directe (5432) pour les migrations, le pooler n'est pas adapté.
- Mots de passe: encodez les caractères spéciaux (utilisez un encodeur URL si nécessaire).

