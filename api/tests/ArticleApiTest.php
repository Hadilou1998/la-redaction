<?php

declare(strict_types=1);

namespace App\Tests;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use ApiPlatform\Symfony\Bundle\Test\Client;
use App\Entity\User;
use App\Entity\Article;
use App\Enum\ArticleStatus;
use Doctrine\ORM\EntityManagerInterface;

final class ArticleApiTest extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    public function testVisitorSeesOnlyPublishedArticles(): void
    {
        $client = static::createClient();

        $response = $client->request("GET", "/api/articles", [
            "headers" => ["Accept" => "application/ld+json"],
        ]);

        self::assertResponseStatusCodeSame(200);

        $data = $response->toArray();

        self::assertGreaterThan(0, $data["totalItems"]);
        self::assertNotEmpty($data["member"]);

        foreach ($data["member"] as $article) {
            self::assertSame("published", $article["status"]);
            self::assertArrayNotHasKey("body", $article);
            self::assertArrayNotHasKey("rejectionReason", $article);

            self::assertArrayNotHasKey("password", $article["author"]);
            self::assertArrayNotHasKey("roles", $article["author"]);
            self::assertArrayNotHasKey("email", $article["author"]);
        }
    }

    public function testVisitorCannotReadDraft(): void
    {
        $client = static::createClient();

        $entityManager = static::getContainer()->get(
            EntityManagerInterface::class
        );

        $draft = $entityManager->getRepository(Article::class)->findOneBy([
            "status" => ArticleStatus::Draft,
        ]);

        self::assertInstanceOf(Article::class, $draft);

        $client->request("GET", "/api/articles/".$draft->getId(), [
            "headers" => ["Accept" => "application/ld+json"],
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testAuthorCanSubmitDraft(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "journalist1@example.test");

        $uri = $this->findArticleUri(
            ArticleStatus::Draft,
            "journalist1@example.test",
        );

        $options = [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ];

        $before = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        $client->request("POST", $uri."/submit", $options);
        self::assertResponseStatusCodeSame(200);

        $after = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        self::assertSame("submitted", $after["status"]);
        self::assertSame($before["author"]["id"], $after["author"]["id"]);
        self::assertSame($before["body"], $after["body"]);
        self::assertNull($after["publishedAt"] ?? null);
    }

    public function testEditorCanPublishSubmittedArticle(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "editor@example.test");
        $uri = $this->findArticleUri(ArticleStatus::Submitted);

        $client->request("POST", $uri."/publish", [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ]);

        self::assertResponseStatusCodeSame(200);

        // La consultation suivante se fait sans authentification.
        $article = $client->request("GET", $uri, [
            "headers" => ["Accept" => "application/ld+json"],
        ])->toArray();

        self::assertResponseStatusCodeSame(200);
        self::assertSame("published", $article["status"]);
        self::assertNotEmpty($article["publishedAt"]);
    }

    public function testJournalistCannotPublishOwnSubmittedArticle(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "journalist2@example.test");

        $uri = $this->findArticleUri(
            ArticleStatus::Submitted,
            "journalist2@example.test",
        );

        $options = [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ];

        $before = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        $client->request("POST", $uri."/publish", $options);
        self::assertResponseStatusCodeSame(403);

        $after = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        self::assertSame("submitted", $after["status"]);
        self::assertSame($before["updatedAt"], $after["updatedAt"]);
        self::assertNull($after["publishedAt"] ?? null);
    }

    public function testEditorCannotPublishDraft(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "editor@example.test");
        $uri = $this->findArticleUri(ArticleStatus::Draft);

        $options = [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ];

        $before = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        $response = $client->request("POST", $uri."/publish", $options);
        self::assertResponseStatusCodeSame(422);

        $error = $response->toArray(false);
        self::assertNotEmpty($error["detail"] ?? "");

        $after = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        self::assertSame("draft", $after["status"]);
        self::assertSame($before["updatedAt"], $after["updatedAt"]);
        self::assertNull($after["publishedAt"] ?? null);
    }

    public function testEditorCanRejectSubmittedArticle(): void
    {
        $client = static::createClient();
        $editorToken = $this->login($client, "editor@example.test");

        $uri = $this->findArticleUri(
            ArticleStatus::Submitted,
            "journalist2@example.test",
        );

        $reason = "Le contenu doit être complété.";

        $client->request("POST", $uri."/reject", [
            "auth_bearer" => $editorToken,
            "headers" => [
                "Accept" => "application/ld+json",
                "Content-Type" => "application/ld+json",
            ],
            "json" => ["rejectionReason" => "   ".$reason."   "],
        ]);

        self::assertResponseStatusCodeSame(200);

        // L'auteur doit pouvoir consulter le motif enregistré.
        $authorToken = $this->login($client, "journalist2@example.test");

        $article = $client->request("GET", $uri, [
            "auth_bearer" => $authorToken,
            "headers" => ["Accept" => "application/ld+json"],
        ])->toArray();

        self::assertResponseStatusCodeSame(200);
        self::assertSame("rejected", $article["status"]);
        self::assertSame($reason, $article["rejectionReason"]);
        self::assertNull($article["publishedAt"] ?? null);
    }

    public function testAuthorCanResumeRejectedArticle(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "journalist2@example.test");

        $uri = $this->findArticleUri(
            ArticleStatus::Rejected,
            "journalist2@example.test",
        );

        $options = [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ];

        $before = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);
        self::assertNotEmpty($before["rejectionReason"]);

        $client->request("POST", $uri."/resume", $options);
        self::assertResponseStatusCodeSame(200);

        $after = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        self::assertSame("draft", $after["status"]);
        self::assertSame(
            $before["rejectionReason"],
            $after["rejectionReason"],
        );
        self::assertSame($before["body"], $after["body"]);
        self::assertSame($before["slug"], $after["slug"]);
        self::assertSame($before["author"]["id"], $after["author"]["id"]);

        $client->request("POST", $uri."/resume", $options);
        self::assertResponseStatusCodeSame(422);

        $afterRefusal = $client->request("GET", $uri, $options)->toArray();
        self::assertResponseStatusCodeSame(200);

        unset($after["author"]["@id"], $afterRefusal["author"]["@id"]);
        self::assertSame($after, $afterRefusal);
    }

    public function testAuthorCanDeleteOwnDraft(): void
    {
        $client = static::createClient();
        $token = $this->login($client, "journalist1@example.test");

        $uri = $this->findArticleUri(
            ArticleStatus::Draft,
            "journalist1@example.test",
        );

        $options = [
            "auth_bearer" => $token,
            "headers" => ["Accept" => "application/ld+json"],
        ];

        $client->request("DELETE", $uri, $options);
        self::assertResponseStatusCodeSame(204);

        $client->request("GET", $uri, $options);
        self::assertResponseStatusCodeSame(404);
    }

    private function login(Client $client, string $email): string
    {
        $response = $client->request("POST", "/api/login", [
            "json" => [
                "email" => $email,
                "password" => "password123",
            ],
        ]);

        self::assertResponseStatusCodeSame(200);

        $data = $response->toArray();

        self::assertArrayHasKey("token", $data);
        self::assertIsString($data["token"]);
        self::assertNotEmpty($data["token"]);

        return $data["token"];
    }

    private function findArticleUri(
        ArticleStatus $status,
        ?string $authorEmail = null,
    ): string {
        $entityManager = static::getContainer()->get(
            EntityManagerInterface::class,
        );

        $criteria = ["status" => $status];

        if ($authorEmail !== null) {
            $author = $entityManager->getRepository(User::class)->findOneBy([
                "email" => $authorEmail,
            ]);

            self::assertInstanceOf(User::class, $author);
            $criteria["author"] = $author;
        }

        $article = $entityManager->getRepository(Article::class)->findOneBy(
            $criteria,
        );

        self::assertInstanceOf(Article::class, $article);

        return "/api/articles/".$article->getId();
    }
}
