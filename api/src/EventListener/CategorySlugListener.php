<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Category;
use App\Repository\CategoryRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\String\Slugger\SluggerInterface;

#[AsEntityListener(
    event: Events::prePersist,
    method: 'prePersist',
    entity: Category::class,
)]
final class CategorySlugListener
{
    public function __construct(
        private readonly SluggerInterface $slugger,
        private readonly CategoryRepository $categoryRepository,
    ) {
    }

    public function prePersist(Category $category): void
    {
        $base = $this->slugger
            ->slug($category->getName() ?? '', '-', 'fr')
            ->lower()
            ->toString();

        $base = substr($base, 0, 100);
        $base = rtrim($base, '-');

        if ($base === '') {
            $base = 'rubrique';
        }

        $slug = $base;
        $suffix = 2;

        while ($this->categoryRepository->findOneBy(['slug' => $slug]) !== null) {
            $slug = $base . '-' . $suffix;
            ++$suffix;
        }

        $category->setSlug($slug);
    }
}
