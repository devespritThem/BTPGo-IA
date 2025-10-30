Benchmark & Analyse concurrentielle

Modèle
- MarketPrice: `category, item, unit, price, currency, region, source, effectiveDate`

Endpoints
- Upload CSV: `POST /market/prices/upload` (columns: category,item,unit,price,region,source,effectiveDate)
- Moyennes: `GET /market/prices/average?category=&item=&region=`
- Benchmarks listings (interne): `GET /market/benchmarks` (moyennes min/max par catégorie)

Idées de données
- Compléter avec prix unitaires issus des `InvoiceLine` (normalisation description)
- Intégrer partenaires (banques/assureurs) pour tarifs/services

