# La Rédaction

Plateforme de gestion éditoriale développée dans le cadre d'un exercice technique. Elle permet de consulter des articles, de gérer leur rédaction et de contrôler leur publication selon le rôle de l'utilisateur.

## Technologies

- **API :** PHP 8.3, Symfony 7.4 LTS, API Platform 4, Doctrine ORM, PostgreSQL 16, authentification JWT (LexikJWTAuthenticationBundle).
- **Front :** React 19, Vite, TypeScript strict, React Router, TanStack Query, ESLint.
- **Environnement et tests :** Docker Compose, PHPUnit / ApiTestCase, DAMADoctrineTestBundle, Vitest 4.1, React Testing Library et jsdom.

## Fonctionnalités réalisées

### API et données

- Utilisateurs avec rôles, mots de passe hashés, connexion `POST /api/login` et profil `GET /api/me`.
- Rubriques consultables publiquement ; création, modification et suppression réservées au rédacteur en chef. Validation et unicité du nom et du slug ; slug généré automatiquement et conservé lors du renommage.
- Articles liés à un auteur et à une rubrique ; titre, chapô, contenu et rubrique validés ; slug unique généré automatiquement, stable lors des modifications ; dates gérées par Doctrine.
- Quatre statuts : `draft`, `submitted`, `published`, `rejected`. Fixtures : **3 utilisateurs, 5 rubriques et 30 articles** (8 brouillons, 8 soumis, 7 publiés, 7 refusés).
- Liste paginée (**10 articles/page**) et détail. Filtres par rubrique, auteur, statut et titre ; tri par date de publication ascendant ou descendant. Par défaut : date de publication décroissante puis identifiant décroissant.
- Visiteur : articles publiés uniquement ; journaliste : articles publiés et ses propres articles privés ; rédacteur en chef : tous les articles. Les articles non accessibles renvoient **404**. Filtrage appliqué côté serveur avant pagination ; auteur exposé uniquement avec son identifiant et son nom affiché ; corps réservé au détail.
- Création réservée aux journalistes authentifiés : auteur et statut brouillon attribués côté API. Seuls titre, chapô, corps et rubrique sont acceptés.
- Modification via `PATCH` : propres brouillons pour le journaliste, articles soumis pour le rédacteur en chef. Autorisations centralisées dans un **Voter** ; champs non autorisés refusés.
- Cycle éditorial :

  | Action | Route | Autorisation / effet |
  | --- | --- | --- |
  | Soumettre | `POST /api/articles/{id}/submit` | Auteur journaliste : `draft` → `submitted` |
  | Publier | `POST /api/articles/{id}/publish` | Rédacteur en chef : `submitted` → `published`, date de publication automatique |
  | Refuser | `POST /api/articles/{id}/reject` | Rédacteur en chef : `submitted` → `rejected`, motif obligatoire nettoyé |
  | Reprendre | `POST /api/articles/{id}/resume` | Auteur journaliste : `rejected` → `draft`, motif conservé |
  | Supprimer | `DELETE /api/articles/{id}` | Auteur journaliste : suppression de son brouillon |

  Les transitions invalides sont refusées ; le motif de refus est consultable par l'auteur et le rédacteur en chef.

### Interface React

- Liste publique des articles publiés : titre, chapô, rubrique, auteur, date, pagination, recherche par titre, filtre par rubrique et tri par date. États de chargement, d'erreur et de liste vide ; filtres applicables et réinitialisables avec retour à la première page.
- Détail public `/articles/:id` : contenu complet, retour à la liste et message commun pour un article introuvable ou inaccessible.
- Connexion avec affichage des erreurs, récupération du profil par JWT, déconnexion et routes protégées selon `ROLE_JOURNALIST` / `ROLE_EDITOR`.
- JWT conservé **en mémoire uniquement** ; expiration contrôlée automatiquement et au retour sur l'onglet ; cache TanStack Query vidé lors des changements de session.
- Espace journaliste `/journalist` : liste paginée de ses articles, quatre statuts, états vide/erreur/chargement et possibilité de réessayer.
- Création `/journalist/articles/new` : formulaire titre, chapô facultatif, contenu et rubrique ; envoi avec JWT ; erreurs de validation conservant les champs ; formulaire désactivé pendant l'envoi ; retour à la liste et invalidation du cache après succès.
- Détail personnel `/journalist/articles/:id` : article complet et motif de refus si présent. Modification proposée uniquement pour un brouillon appartenant au journaliste connecté ; formulaire prérempli, enregistrement `PATCH` en JSON Merge Patch avec JWT, confirmation, mise à jour des caches, gestion des erreurs `422` et annulation sans requête.
- Soumission d'un brouillon par son auteur et reprise d'un article refusé : actions dédiées, états de chargement, gestion des erreurs et possibilité de réessayer, mise à jour du détail et invalidation du cache de la liste personnelle. Après reprise, le motif de refus reste visible.
- Suppression d'un brouillon personnel avec confirmation et possibilité d'annuler. Requête `DELETE` authentifiée, gestion des erreurs et nouvelle tentative, actualisation du cache et retour à la liste après succès.
- Appels API centralisés dans `front/src/api/articles.ts` et `front/src/api/auth.ts`. Les autorisations réelles restent vérifiées par Symfony, même si le front masque les actions interdites.

## Installation et démarrage

**Prérequis :** Docker Desktop, Git, Node.js et npm (versions utilisées : Node 22.22.0 et npm 10.9.4).

Depuis la racine du dépôt, créer les fichiers locaux :

```powershell
Copy-Item .env.example .env
Copy-Item api/.env.example api/.env.local
```

Renseigner le même mot de passe PostgreSQL dans `POSTGRES_PASSWORD` (`.env`) et `DATABASE_URL` (`api/.env.local`). Encoder les caractères réservés aux URL dans `DATABASE_URL` si nécessaire.

```powershell
docker compose up -d --build
docker compose exec php composer install
```

Générer **deux secrets distincts** avec cette commande (à exécuter deux fois) :

```powershell
docker compose exec php php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Placer le premier dans `APP_SECRET` et le second dans `JWT_PASSPHRASE` de `api/.env.local`, puis initialiser l'API :

```powershell
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec php php bin/console doctrine:migrations:migrate
docker compose exec php php bin/console doctrine:fixtures:load
```

**Attention :** le chargement des fixtures remplace les données existantes. Les clés JWT et fichiers locaux sont ignorés par Git.

Démarrer le front dans un deuxième terminal :

```powershell
cd front
npm ci
npm run dev
```

- Front : <http://localhost:5173>
- API : <http://127.0.0.1:8000>
- Le proxy Vite transmet `/api` à Symfony en développement ; une configuration spécifique sera nécessaire en production.

Pour arrêter : `Ctrl+C` dans le terminal Vite, puis `docker compose down` à la racine. Le volume PostgreSQL conserve les données.

## Utilisation de l'API

`GET /api/articles` accepte les paramètres combinables suivants :

| Paramètre | Exemple |
| --- | --- |
| `category` | `category=/api/categories/1` |
| `author` | `author=1` |
| `status` | `status=published` |
| `title` | `title=article` |
| `order[publishedAt]` | `order[publishedAt]=desc` |
| `page` | `page=2` |

Exemple : `GET /api/articles?status=published&title=article&order%5BpublishedAt%5D=desc`.

Les filtres ne contournent jamais les droits d'accès. La liste personnelle du journaliste utilise son identifiant comme filtre `author`, transmet le JWT et n'impose aucun statut.

### Comptes de démonstration

| Profil | Email | Mot de passe |
| --- | --- | --- |
| Rédacteur en chef | `editor@example.test` | `password123` |
| Journaliste 1 | `journalist1@example.test` | `password123` |
| Journaliste 2 | `journalist2@example.test` | `password123` |

Comptes réservés au développement local. Les JWT expirent après **1 heure**.

## Vérifications et tests

### API

Pour vérifier la configuration :

```powershell
docker compose exec php php bin/console about
docker compose exec php php bin/console doctrine:schema:validate
```

Les tests utilisent la base `la_redaction_test`. Créer `api/.env.test.local` avec `DATABASE_URL` et `JWT_PASSPHRASE` (et les chemins JWT personnalisés, le cas échéant). Conserver `la_redaction` dans l'URL : Doctrine ajoute `_test`. Ce fichier est ignoré par Git.

```powershell
docker compose exec php php bin/console doctrine:database:create --env=test --if-not-exists
docker compose exec php php bin/console doctrine:migrations:migrate --env=test --no-interaction
docker compose exec php php bin/console doctrine:fixtures:load --env=test --no-interaction
docker compose exec php php bin/phpunit
```

**Résultat documenté : 14 tests, 260 assertions.** Les tests couvrent notamment visibilité et pagination, filtres et tri, soumission, publication, refus, reprise, suppression, droits d'accès et transitions interdites. DAMADoctrineTestBundle annule les modifications entre les tests ; les réponses d'erreur attendues (`403`, `404`, `422`) ne constituent pas des échecs.

**Vérifications manuelles effectuées :** rubriques (lecture, création, modification, validation, suppression) ; articles (fixtures, slugs uniques, dates) ; visibilité selon les rôles ; création et modification autorisées ou refusées ; soumission, publication, refus avec motif, reprise et suppression ; conservation des données après opérations interdites. Les codes `200`, `201`, `204`, `400`, `401`, `403`, `404` et `422` ont été contrôlés selon les scénarios. Les listes de deux journalistes ont été parcourues sans fuite d'articles privés. Les quantités constatées après manipulations locales peuvent différer des fixtures initiales.

### Front

Depuis `front` :

```powershell
npm test
npm run test:watch
npm run build
npm run lint
```

**Résultat documenté : 43 tests réussis dans 8 fichiers**, avec Vitest et React Testing Library. Ils vérifient la liste publique, la pagination, les filtres, le détail et les `404`, la connexion et les rôles, l'expiration JWT, la liste personnelle, la création, la modification, la soumission, la reprise et la suppression des brouillons, les erreurs `422`, les confirmations, l'annulation et la cohérence du cache. Les appels API sont simulés : ces tests ne nécessitent pas Symfony ni la base PostgreSQL. Compilation TypeScript et lint vérifiés.

**Vérifications manuelles effectuées :** consultation publique, filtres, tri et détail ; récupération après erreur API ; liste et pagination des deux journalistes ; création d'un brouillon avec retour à la liste ; détail personnel, modification préremplie, confirmation et contenu mis à jour. Le proxy `/api/articles` a également été vérifié sans authentification.

## Choix techniques

- Doctrine gère les entités, migrations et dates ; des listeners produisent les slugs, et une extension Doctrine filtre la visibilité avant pagination.
- API Platform expose les ressources, groupes de sérialisation et filtres (`IriFilter`, `ExactFilter`, `PartialSearchFilter`, `SortFilter`) ; processors et Voter encadrent les opérations et transitions.
- React Router gère les pages ; React Context partage la session ; TanStack Query gère requêtes, erreurs et cache (clés distinctes par utilisateur, article, page et filtres).
- `URLSearchParams` encode les filtres ; React échappe le texte affiché ; TypeScript 5.9.3 et le `package-lock.json` stabilisent l'environnement du front.
- L'audit npm initial signalait 12 alertes modérées dans les dépendances de développement ESLint/minimatch et aucune vulnérabilité hors dépendances de développement à cette étape ; audit à actualiser après ajout des outils de test.

## Limites et prochaines étapes

- La soumission, la reprise et la suppressionsont disponibles côté front. La publication et le refus restent à intégrer à l'espace rédacteur en chef.
- L'espace rédacteur en chef est encore provisoire : développer sa liste des articles soumis, leur consultation et modification, la publication et le refus avec motif, ainsi que la gestion des rubriques dans l'interface.
- Compléter les tests API (notamment création, modification, validations et permissions) et front ; améliorer formulaires et navigation.
- La session n'est pas persistée après rechargement (pas de refresh token). Le serveur PHP intégré et le proxy Vite sont destinés au développement.
- Vérifier l'installation depuis un clone vierge et actualiser l'audit npm.

## Temps passé

96 h
