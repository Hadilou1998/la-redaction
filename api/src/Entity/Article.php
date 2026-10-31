<?php

namespace App\Entity;

use App\Repository\ArticleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Enum\ArticleStatus;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Symfony\Component\Serializer\Attribute\Groups;
use ApiPlatform\Metadata\Post;
use App\State\ArticleCreateProcessor;
use ApiPlatform\Metadata\Patch;
use App\State\ArticleSubmitProcessor;
use ApiPlatform\Doctrine\Orm\State\ItemProvider;
use App\State\ArticlePublishProcessor;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(
            normalizationContext: [
                "groups" => ["article:read", "article:detail"],
            ],
        ),
        new Post(
            security: "is_granted('ROLE_JOURNALIST')",
            normalizationContext: [
                "groups" => ["article:read", "article:detail"],
            ],
            denormalizationContext: [
                "groups" => ["article:write"],
                "allow_extra_attributes" => false,
            ],
            processor: ArticleCreateProcessor::class,
        ),
        new Patch(
            security: "is_granted('ARTICLE_EDIT', object)",
            normalizationContext: [
                "groups" => ["article:read", "article:detail"],
            ],
            denormalizationContext: [
                "groups" => ["article:write"],
                "allow_extra_attributes" => false,
            ],
        ),
        new Post(
            uriTemplate: "/articles/{id}/submit",
            status: 200,
            security: "is_granted('ARTICLE_SUBMIT', object)",
            normalizationContext: [
                "groups" => ["article:read", "article:detail"],
            ],
            read: true,
            throwOnNotFound: true,
            deserialize: false,
            provider: ItemProvider::class,
            processor: ArticleSubmitProcessor::class,
        ),
        new Post(
            uriTemplate: "/articles/{id}/publish",
            status: 200,
            security: "is_granted('ARTICLE_PUBLISH', object)",
            normalizationContext: [
                "groups" => ["article:read", "article:detail"],
            ],
            read: true,
            throwOnNotFound: true,
            deserialize: false,
            provider: ItemProvider::class,
            processor: ArticlePublishProcessor::class,
        ),
    ],
    normalizationContext: ["groups" => ["article:read"]],
    order: ["publishedAt" => "DESC", "id" => "DESC"],
    paginationItemsPerPage: 10,
)]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups("article:read")]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank(message: "Le titre est obligatoire.")]
    #[Assert\Length(
        min: 10,
        max: 150,
        minMessage: "Le titre doit contenir au moins {{ limit }} caractères.",
        maxMessage: "Le titre doit contenir au plus {{ limit }} caractères.",
    )]
    #[Groups(["article:read", "article:write"])]
    private ?string $title = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Groups("article:read")]
    private ?string $slug = null;

    #[ORM\Column(length: 300)]
    #[Assert\Length(
        max: 300,
        maxMessage: "Le chapô ne doit pas dépasser {{ limit }} caractères.",
    )]
    #[Groups(["article:read", "article:write"])]
    private ?string $chapo = "";

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank(
        message: "Le corps de l'article est obligatoire.",
        normalizer: "trim",
    )]
    #[Groups(["article:detail", "article:write"])]
    private ?string $body = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    #[ORM\Column]
    #[Groups("article:read")]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups("article:read")]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups("article:read")]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups("article:read")]
    private ?User $author = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: "La rubrique est obligatoire.")]
    #[Groups(["article:read", "article:write"])]
    private ?Category $category = null;

    #[ORM\Column(length: 20, enumType: ArticleStatus::class)]
    #[Groups("article:read")]
    private ArticleStatus $status = ArticleStatus::Draft;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = trim($title);

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): static
    {
        $this->slug = $slug;

        return $this;
    }

    public function getChapo(): ?string
    {
        return $this->chapo;
    }

    public function setChapo(string $chapo): static
    {
        $this->chapo = $chapo;

        return $this;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    public function setBody(string $body): static
    {
        $this->body = $body;

        return $this;
    }

    public function getRejectionReason(): ?string
    {
        return $this->rejectionReason;
    }

    public function setRejectionReason(?string $rejectionReason): static
    {
        $this->rejectionReason = $rejectionReason;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function setPublishedAt(?\DateTimeImmutable $publishedAt): static
    {
        $this->publishedAt = $publishedAt;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getStatus(): ArticleStatus
    {
        return $this->status;
    }

    public function setStatus(ArticleStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    #[ORM\PrePersist]
    public function initializeDates(): void
    {
        $now = new \DateTimeImmutable();

        $this->createdAt ??= $now;
        $this->updatedAt ??= $now;
    }

    #[ORM\PreUpdate]
    public function refreshUpdatedAt(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
