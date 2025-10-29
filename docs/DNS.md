DNS

Objectif
- `app.<votre-domaine>` → Backend Fly.io
- `www.<votre-domaine>` → Frontend o2switch

Actions
- Fly.io: récupérer CNAME cible `<app>.fly.dev` et créer CNAME DNS `app → <app>.fly.dev`
- o2switch: pointer `www` vers l’hébergement (selon doc o2switch; souvent A/alias)
- Option: `@` (apex) redirige vers `www` côté DNS provider

