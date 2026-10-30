<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Article;
use App\Repository\ArticleRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\String\Slugger\SluggerInterface;

#[AsEntityListener(
    event: Events::prePersist,
    method: 'prePersist',
    entity: Article::class,
)]
final class ArticleSlugListener
{
    /** @var array<string, true> */
    private array $reservedSlugs = [];

    public function __construct(
        private readonly SluggerInterface $slugger,
        private readonly ArticleRepository $articleRepository,
    ) {
    }

    public function prePersist(Article $article): void
    {
        $base = $this->slugger
            ->slug($article->getTitle() ?? '', '-', 'fr')
            ->lower()
            ->toString();

        $base = rtrim(substr($base, 0, 160), '-');

        if ($base === '') {
            $base = 'article';
        }

        $slug = $base;
        $suffix = 2;

        while (
            isset($this->reservedSlugs[$slug])
            || $this->articleRepository->findOneBy(['slug' => $slug]) !== null
        ) {
            $slug = $base . '-' . $suffix;
            ++$suffix;
        }

        $this->reservedSlugs[$slug] = true;
        $article->setSlug($slug);
    }
}
