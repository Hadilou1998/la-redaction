# La Redaction

Plateforme de gestion éditoriale réalisée dans le cadre d'un exercice technique.

## Etat actuel

- Environnement Docker avec PHP 8.3 et PostgreSQL 16.
- Symfony 7.4 LTS, API Platform 4 et Doctrine ORM installés.
- Entité User créée et migration appliquée.

L'authentification JWT, les fonctionnalités éditoriales, le front React
et les tests restent à développer.

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
- `DATABASE_URL` du fichier `.api/.env.local` :

Utiliser le même mot de passe pour les deux fichiers.
Si le mot de passe contient des caractères réservés aux URL,
encoder des caractères dans `DATABASE_URL`.

Construire et démarrer les conteneurs :

```powershell
docker-compose up -d --build
```

Installer les dépendances PHP :

```powershell
docker-compose exec php composer install
```

Générer un secret local :

```powershell
docker-compose exec php php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Copier la valeur obtenue dans `APP_SECRET` du fichier `api/.env.local`.

Créer les tables :

```powershell
docker-compose exec php php bin/console doctrine:migrations:migrate ou d:m:m
```

## Vérifications

```powershell
docker-compose exec php php bin/console about
docker-compose exec php php bin/console doctrine:schema:validate ou d:s:v
```

## Arrêt

```powershell
docker-compose down
```

Les données PostgreSQL sont conservées dans un volume Docker.

## Limites actuelles

Le conteneur PHP reste démarré pour permettre les commandes de développement.
Le serveur HTTP n'est pas encore configuré : aucune page de l'application
n'est disponible sur le port 8000.

L'installation depuis un clone vierge reste à vérifier

## Tests

Les tests ne sont pas encore implémentés.

## Comptes de démonstration

Aucun compte de démonstration n'est encore créé.

## Choix techniques

- Docker permet d'exécuter PHP et PostgreSQL sans installation locale.
- Doctrine gère la persistance et les migrations de la base.
- API Platform servira à exposer les ressources et contrôler leurs opérations.
- React sera développer dans le dossier front.

## Temps passé

À renseigner au fur et à mesure du développement.
