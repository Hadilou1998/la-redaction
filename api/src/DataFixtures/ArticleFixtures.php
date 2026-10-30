<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\Article;
use App\Entity\Category;
use App\Entity\User;
use App\Enum\ArticleStatus;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

final class ArticleFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        $userRepository = $manager->getRepository(User::class);

        $authors = [
            $userRepository->findOneBy(["email" => "journalist1@example.test"]),
            $userRepository->findOneBy(["email" => "journalist2@example.test"]),
        ];

        $categories = $manager
            ->getRepository(Category::class)
            ->findBy([], ["slug" => "ASC"]);

        if (
            !$authors[0] instanceof User
            || !$authors[1] instanceof User
            || count($categories) !== 5
        ) {
            throw new \LogicException(
                "Les deux journalistes et les cinq rubriques sont nécessaires."
            );
        }

        $statuses = ArticleStatus::cases();
        $now = new \DateTimeImmutable();

        for ($i = 1; $i <= 30; ++$i) {
            $status = $statuses[($i - 1) % count($statuses)];
            $createdAt = $now->modify(sprintf("-%d days", 31 - $i));

            $article = new Article();
            $article->setTitle(
                $i <= 2
                    ? "Les nouvelles du jour"
                    : sprintf("Article de démonstration numéro %d", $i)
            );
            $article->setChapo(
                sprintf("Présentation de l'article de démonstration numéro %d.", $i)
            );
            $article->setBody(
                sprintf(
                    "Cet article numéro %d contient un texte de démonstration pour tester la plateforme.",
                    $i
                )
            );
            $article->setAuthor($authors[($i - 1) % 2]);
            $article->setCategory($categories[($i - 1) % count($categories)]);
            $article->setStatus($status);
            $article->setCreatedAt($createdAt);
            $article->setUpdatedAt($createdAt);

            if ($status === ArticleStatus::Published) {
                $publishedAt = $createdAt->modify("+2 hours");
                $article->setPublishedAt($publishedAt);
                $article->setUpdatedAt($publishedAt);
            }

            if ($status === ArticleStatus::Rejected) {
                $article->setRejectionReason(
                    "Merci de préciser les sources avant une nouvelle soumission."
                );
                $article->setUpdatedAt($createdAt->modify("+1 hour"));
            }

            $manager->persist($article);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            UserFixtures::class,
            CategoryFixtures::class,
        ];
    }
}
