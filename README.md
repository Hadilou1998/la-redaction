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
- Entité Article liée à un auteur et une rubrique, avec migration appliquée.
- Quatre statuts définis par une énumération PHP.
- Validation du titre, du chapô, du corps et de la rubrique.
- Slugs des articles générés automatiquement et uniques en base.
- Callbacks Doctrine pour initialiser et actualiser les dates.
- Trente articles de démonstration dans des statuts variés.
- Liste paginée et détail des articles accessibles via l'API.
- Visiteurs : accès aux articles publiés uniquement.
- Rédacteur en chef : accès à tous les articles.
- Articles privés inaccessibles renvoyés en 404.
- Données de l'auteur limitées à son identifiant et son nom affiché.
- Journalistes : accès aux articles publiés et à leurs propres articles privés.
- Création d'un article réservée aux journalistes connectés.
- Attribution automatique de l'auteur et du statut brouillon.
- Refus des champs non autorisés dans les requêtes de création.
- Modification des brouillons réservée à leur auteur journaliste.
- Modification des articles soumis réservée au rédacteur en chef.
- Permissions de modification centralisées dans un Voter.
- Soumission d'un brouillon réservée à son auteur journaliste.
- Passage de draft à submitted via POST /api/articles/{id}/submit.
- Après soumission, le journaliste ne peut plus modifier l'article.
- Publication des articles soumis réservée au rédacteur en chef.
- Passage de submitted à published via POST /api/articles/{id}/publish.
- Date de publication attribuée automatiquement.
- Article accessible sans connexion après publication.
- Refus des articles soumis réservé au rédacteur en chef.
- Passage de submitted à rejected via POST /api/articles/{id}/reject.
- Motif de refus obligatoire, nettoyé et consultable par l'auteur.
- Reprise d'un article refusé réservée à son auteur journaliste.
- Passage de rejected à draft via POST /api/articles/{id}/resume.
- Motif de refus conservé et visible après la reprise.
- Suppression d'un brouillon réservée à son auteur journaliste.
- Suppression via DELETE /api/articles/{id}.
- Neuf tests API automatisés avec PHPUnit et ApiTestCase.
- Base PostgreSQL dédiée aux tests.
- Annulation des modifications de chaque test avec DAMADoctrineTestBundle.

Les filtres de recherche, le front React et les tests front
restent à développer. La couverture des tests API reste à compléter.

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

Charger les trois utilisateurs, les cinq rubriques et les trente articles
de démonstration :

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

La lecture des articles, le filtrage de leur visibilité et la création
de brouillons par les journalistes sont implémentés.
La modification est autorisée pour l'auteur d'un brouillon
et pour le rédacteur en chef sur les articles soumis.
L'auteur journaliste peut soumettre son brouillon pour validation.

Les filtres de recherche, le front React et les tests front
restent à développer. La couverture des tests API reste à compléter.

L'installation depuis un clone vierge reste à vérifier.

## Tests

### Tests API automatisés

Les tests utilisent PHPUnit et ApiTestCase d'API Platform.
Ils s'exécutent dans l'environnement test sur la base la_redaction_test.

Après l'installation du projet et la génération des clés JWT,
créer api/.env.test.local avec DATABASE_URL et JWT_PASSPHRASE,
en reprenant les valeurs locales utilisées pendant l'installation.
Reprendre également les chemins JWT si ceux-ci ont été personnalisés.

DATABASE_URL doit conserver le nom la_redaction :
Doctrine ajoute automatiquement le suffixe _test.
Le fichier api/.env.test.local est ignoré par Git.

Préparer la base de test :

```powershell
docker compose exec php php bin/console doctrine:database:create --env=test --if-not-exists
docker compose exec php php bin/console doctrine:migrations:migrate --env=test --no-interaction
docker compose exec php php bin/console doctrine:fixtures:load --env=test --no-interaction
```

Le chargement des fixtures supprime les données de la base de test.

Lance tous les tests :

```powershell
docker compose exec php php bin/phpunit
```

Résultat vérifié : 9 tests, 134 assertions.

Les tests couvrent :

- La lecture publique des articles publiés et les champs exposés ;
- La réponse 404 sur un brouillon consulté par un visiteur ;
- La soumission d'un brouillon par son auteur ;
- La publication d'un article soumis par le rédacteur ;
- Le refus de publication par un journaliste ;
- Le refus de publication directe d'un brouillon ;
- Le refus d'un article soumis avec motif nettoyé et visible par l'auteur ;
- La reprise d'un article refusé avec conservation du motif ;
- Le refus d'une deuxième reprise ;
- La suppression d'un brouillon par son auteur.

DAMADoctrineTestBundle annule les modifications après chaque test.
Les tests retrouvent les articles sans dépendre de leurs identifiants numériques.
Les messages de journalisation des réponses 403, 404 et 422 attendues
ne constituent pas des échecs de test.

Vérifications manuelles de la publication des articles :

- publication d'un article soumis par le rédacteur en chef : 200 ;
- passage du statut published et date de publication renseignée ;
- conservation de l'auteur, du titre, du corps, du slug et de createdAt ;
- actualisation de updatedAt ;
- consultation sans connexion après publication ;
- deuxième publication refusée : 422 ;
- publication directe d'un brouillon refusée : 422 ;
- dates de l'article publié conservées après ces refus ;
- brouillon resté non publié après la tentative refusée ;
- publication par le journaliste auteur d'un article soumis refusée : 403 ;
- article soumis inchangé après ce refus.

Les nombres d'articles indiqués ci-dessous correspondent aux fixtures initiales,
avant les créations effectuées pendant les vérifications manuelles.

Vérifications manuelles effectuées pour les rubriques :

- lecture publique : 200 ;
- création par le rédacteur en chef avec génération du slug ;
- création par un journaliste refusée : 403 ;
- modification du nom avec conservation du slug ;
- nom vide refusé : 422 ;
- suppression : 204, puis consultation : 404 ;
- chargement des cinq rubriques par les fixtures.

Vérifications manuelles effectuées pour le modèle Article :

- schéma PostgreSQL synchronisé avec les entités ;
- chargement de 30 articles : 8 brouillons, 8 soumis, 7 publiés et 7 refusés ;
- génération des slugs distincts pour deux titres identiques ;
- cohérence des dates, des dates de publication et de motifs de refus.

Vérifications manuelles de la visibilité des articles :

- un visiteur voit uniquement les 7 articles publiés ;
- un visiteur reçoit 404 sur un brouillon existant ;
- l'auteur peut consulter son brouillon ;
- un autre journaliste reçoit 404 sur ce même brouillon ;
- le rédacteur en chef accède au brouillon et aux 30 articles ;
- toutes les pages des deux journalistes ont été parcourues,
  sans doublon ni article privé d'un autre auteur.

Vérifications manuelles de la création des articles :

- création par un journaliste connecté : 201 ;
- auteur connecté, statut brouillon, slug et dates attribués automatiquement ;
- contenu complet présent dans la réponse de création ;
- création sans connexion refusée : 401 ;
- statut envoyé par le client refusé : 400 ;
- titre trop court : 422 ;
- contenu vide refusé : 422 ;
- rubrique manquante refusée : 422.

Vérifications manuelles de la modification des articles :

- modification d'un brouillon par son auteur : 200 ;
- conservation du slug, de l'auteur, du statut et de la date de création ;
- actualisation de la date de modification ;
- modification du brouillon par un autre journaliste refusée : 404 ;
- statut envoyé par l'auteur refusé : 400 ;
- titre vide refusé : 422 ;
- absence de modification persistée après ces refus ;
- modification d'un article soumis par le rédacteur en chef : 200 ;
- modification d'un article publié ou d'un brouillon par le rédacteur
  en chef refusée : 403 ;
- modification d'un article soumis par son auteur refusée : 403.

Vérifications manuelles de la soumission des articles :

- soumission d'un brouillon par son auteur : 200 ;
- passage au statut submitted et actualisation de updatedAt ;
- conservation de l'auteur, du titre, du corps, du slug et de createdAt ;
- absence de date de publication après soumission ;
- deuxième soumission refusée : 422 ;
- modification par l'auteur après soumission refusée : 403 ;
- article inchangé après ces refus ;
- soumission du brouillon par un visiteur ou un autre journaliste : 404 ;
- soumission du brouillon par le rédacteur en chef refusée : 403.

Vérifications manuelles du refus des articles :

- refus d'un article soumis par le rédacteur en chef : 200 ;
- passage du statut rejected et motif enregistré sans espaces autour ;
- absence de date de publication ;
- consultation du motif par l'auteur dans le détail de l'article ;
- motif absent, vide ou composé d'espaces refusé : 422 ;
- deuxième refus d'un article déjà refusé : 422 ;
- refus d'un brouillon ou d'un article publié : 422 ;
- motif initial conservé après une deuxième tentative de refus ;
- refus par le journaliste auteur d'un article soumis : 403 ;
- article soumis inchangé après cette tentative interdite.

Vérifications manuelles de la reprise des articles :

- reprise d'un article refusé par son auteur : 200 ;
- retour au statut draft et motif conservé et visible ;
- conservation de l'auteur, du titre, du corps, du slug et de createdAt ;
- actualisation de updatedAt et absence de date de publication ;
- deuxième reprise refusée : 422 ;
- reprise par un visiteur ou un autre journaliste : 404 ;
- reprise par le rédacteur en chef refusée : 403 ;
- statut, motif et date de modification conservés après ces refus.

Vérification manuelle de la suppression des articles :

- suppression d'un brouillon par son auteur : 204 ;
- consultation après suppression : 404 ;
- suppression du brouillon par un visiteur ou un autre journaliste : 404 ;
- suppression du brouillon par le rédacteur en chef : 403 ;
- brouillon inchangé après les tentatives interdites ;
- suppression de son article publié par un journaliste : 403 ;
- article publié et dates conservés après cette tentative.

La couverture automatisée reste à compléter, notamment pour la création,
la modification, les validations et les autres combinaisons de permissions.

## Comptes de démonstration

| Profil | Email | Mot de passe |
| --- | --- | --- |
| Rédacteur en chef | `editor@example.test` | password123 |
| Journaliste 1 | `journalist1@example.test` | password123 |
| Journaliste 2 | `journalist2@example.test` | password123 |

Ces identifiants sont publics et réservés au développement local.
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

### Articles

Une énumération PHP définit les quatre statuts possibles :
draft, submitted, published et rejected.
Elle limite les valeurs possibles.
Les transitions de draft vers submitted, submitted vers published
et submitted vers rejected sont implémentées.
La transition de rejected vers draft permet à l'auteur de reprendre
un article refusé pour le corriger, tout en conservant le motif visible.

Un listener Doctrine génère les slugs à partir des titres.
Il vérifie les slugs existants et ceux réservés pendant le chargement en cours.
Un suffixe permet de distinguer les articles portant le même titre.
Le slug reste stable lorsque le titre change.

Les callbacks Doctrine initialisent createdAt et updatedAt à la création,
puis actualisent updatedAt lors d'une modification.
Les fixtures peuvent fournir des dates historiques.

Une extension Doctrine filtre les articles accessibles selon l'utilisateur,
pour les listes comme pour les détails, avant la pagination.
Un article inaccessible est exclu des résultats et sa consultation renvoie 404.

Les groupes de sérialisation contrôlent les champs renvoyés.
Le corps est réservé au détail ; l'auteur expose uniquement son identifiant
et son nom affiché.

Un processor attribue automatiquement l'auteur connecté et impose
le statut brouillon avant l'enregistrement par Doctrine.

Seuls le titre, le chapô, le corps et la rubrique sont acceptés
dans la requête de création grâce au groupe article:write.
Les champs supplémentaires sont refusés.

La réponse de création contient aussi le corps de l'article,
comme la consultation du détail.

L'opération PATCH utilise un Voter pour vérifier les permissions
avant d'appliquer les modifications.
Un journaliste peut modifier uniquement ses propres brouillons.
Le rédacteur en chef peut modifier uniquement les articles soumis.
Les champs modifiables sont le titre, le chapô, le corps et la rubrique.
Les champs supplémentaires sont refusés.

La soumission utilise un processor et la permission ARTICLE_SUBMIT du Voter.
Seul l'auteur journaliste peut soumettre son article au statut draft.
Cette action ne nécessite aucun corps JSON.

L'article est chargé par le provider Doctrine avec filtrage de visibilité.
L'option throwOnNotFound impose une réponse 404 si l'article est introuvable
ou inaccessible, y compris sur cette opération POST.

Pour la soumission, le Voter vérifie le rôle et l'identité de l'auteur.
Le processor vérifie que l'article est en brouillon.
Une transition de soumission invalide renvoie 422.

Le refus utilise la permission ARTICLE_REJECT du Voter.
Le processor vérifie le statut submitted, nettoie le motif obligatoire
et applique le statut rejected. Une transition invalide renvoie 422.

Le motif est modifiable uniquement par l'opération de refus.
Dans le détail, sa consultation est réservée à l'auteur et au rédacteur
en chef grâce à une condition de sécurité sur la propriété.

La reprise utilise la permission ARTICLE_RESUME du Voter.
Le Voter contrôle le rôle journaliste et l'identité de l'auteur.
Le processor exige le statut rejected, puis applique le statut draft
sans effacer le motif. Une transition invalide renvoie 422.
Cette action ne nécessite aucun corps JSON.

La suppression utilise la permission ARTICLE_DELETE du Voter
et le mécanisme de suppression Doctrine fourni par API Platform.

## Priorités pour la suite

Ajouter les filtres et développer le front React avec ses tests.
Compléter la couverture des tests API et vérifier l'installation
depuis un clone vierge.

Avec davantage de temps, ajouter une intégration continue exécutant
les tests et étudier le composant Workflow de Symfony pour centraliser
les transitions de statut.

## Temps passé

48h
