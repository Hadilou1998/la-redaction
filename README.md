# La Rédaction

Plateforme de gestion éditoriale réalisée dans le cadre d'un exercice technique.

## État actuel

- Environnement Docker avec PHP 8.3 et PostgreSQL 16.
- Symfony 7.4 LTS, API Platform 4 et Doctrine ORM installés.
- Entité User créée et migration appliquée.
- Authentification JWT avec LexikJWTAuthenticationBundle.
- Route POST /api/login : connexion par email et mot de passe.
- Route GET /api/me : profil de l'utilisateur connecté.
- Trois comptes de démonstration avec mots de passe hashés.
- Serveur HTTP de développement accessible sur <http://127.0.0.1:8000>.
- Rubriques : lecture publique et écritures réservées au rédacteur en chef.
- Validation du nom et unicité du nom et du slug.
- Génération automatique du slug à la création.
- Cinq rubriques de démonstration chargées par les fixtures.

Les fonctionnalités éditoriales, le front React et les tests restent à développer.

## Prérequis

- Docker Desktop démarré avec les conteneurs.
- Git.
- Node.js et npm pour le futur front React.

## Installation

Depuis la racine du dépôt, copier les configurations d'exemple :

```powershell
Copy-Item .env.example .env
Copy-Item api/.env.example api/.env.local
```

Choisir un mot de passe PostgreSQL et le renseigner dans :

- `POSTGRES_PASSWORD` du fichier `.env` :
- `DATABASE_URL` du fichier `api/.env.local` :

Utiliser le même mot de passe pour les deux fichiers.
Si le mot de passe contient des caractères réservés aux URL,
encoder ces caractères dans `DATABASE_URL`.

Construire et démarrer les conteneurs :

```powershell
docker compose up -d --build
```

Installer les dépendances PHP :

```powershell
docker compose exec php composer install
```

Générer un secret pour Symfony :

```powershell
docker compose exec php php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Renseigner le résultat dans `APP_SECRET` du fichier `api/.env.local`.

Générer une autre valeur pour protéger la clé privée JWT :

```powershell
docker compose exec php php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

La renseigner dans `JWT_PASSPHRASE` du fichier `api/.env.local`.

Générer les clés JWT :

```powershell
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists
```

Les clés et les configurations locales sont ignorées par Git.

Créer les tables :

```powershell
docker compose exec php php bin/console doctrine:migrations:migrate
```

Charger les utilisateurs et les rubriques de démonstration :

```powershell
docker compose exec php php bin/console doctrine:fixtures:load
```

Attention : cette commande supprime les données existantes avant de charger les fixtures.

## Vérifications

```powershell
docker compose exec php php bin/console about
docker compose exec php php bin/console doctrine:schema:validate
```

## Arrêt

```powershell
docker compose down
```

Les données PostgreSQL sont conservées dans un volume Docker.

## Limites actuelles

Le serveur PHP intégré est utilisé uniquement pour le développement.
L'API est accessible sur <http://127.0.0.1:8000>.

Les articles, leurs règles métier, le front React et les tests automatisés
restent à développer.

L'installation depuis un clone vierge reste à vérifier.

## Tests

Les tests ne sont pas encore implémentés.

Vérifications manuelles effectuées pour les rubriques :

- lecture publique : 200 ;
- création par le rédacteur en chef avec génération du slug ;
- création par un journaliste refusée : 403 ;
- modification du nom avec conservation du slug ;
- nom vide refusé : 422 ;
- suppression : 204, puis consultation : 404 ;
- chargement des cinq rubriques par les fixtures.

## Comptes de démonstration

| Profil | Email | Mot de passe |
| --- | --- | --- |
| Rédacteur en chef | `editor@example.test` | password123 |
| Journaliste 1 | `journalist1@example.test` | password123 |
| Journaliste 2 | `journalist2@example.test` | password123 |

Ces identifiants sont publics et reservés au développement local.
Les JWT expirent après 1 heure.

## Choix techniques

- Docker permet d'exécuter PHP et PostgreSQL sans installation locale.
- Doctrine gère la persistance et les migrations de la base.
- API Platform expose les ressources et contrôle leurs opérations.
- React sera développé dans le dossier front.

Les visiteurs peuvent consulter les rubriques pour filtrer les articles.
La création, la modification et la suppression nécessitent ROLE_EDITOR.
Ces permissions sont vérifiées côté API Platform.

Le client peut modifier uniquement le nom.
Un listener Doctrine génère le slug à la création, y compris pour les fixtures.
Le slug reste stable lorsque le nom change afin de conserver les URL.
Les contraintes uniques PostgreSQL empêchent les doublons.

## Temps passé

À renseigner au fur et à mesure du développement.
