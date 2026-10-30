<?php

declare(strict_types=1);

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Article;
use App\Entity\User;
use App\Enum\ArticleStatus;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

final class ArticleVisibilityExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(
        private readonly Security $security,
    ) {
    }

    /**
     * filtres les listes avant la pagination
     */
    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->restrictVisibility(
            $queryBuilder,
            $queryNameGenerator,
            $resourceClass,
        );
    }

    /**
     * filtre aussi la récupération d'un article précis
     */
    public function applyToItem(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        array $identifiers,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->restrictVisibility(
            $queryBuilder,
            $queryNameGenerator,
            $resourceClass,
        );
    }

    /**
     * filtre la visibilité des articles
     */
    private function restrictVisibility(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
    ): void {
        if ($resourceClass !== Article::class) {
            return;
        }

        if ($this->security->isGranted("ROLE_EDITOR")) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $statusParameter = $queryNameGenerator->generateParameterName("status");

        $condition = sprintf(
            "%s.status = :%s",
            $alias,
            $statusParameter,
        );

        $queryBuilder->setParameter(
            $statusParameter,
            ArticleStatus::Published->value,
        );

        $user = $this->security->getUser();
        if (
            $user instanceof User
            && $this->security->isGranted("ROLE_JOURNALIST")
        ) {
            $authorParameter = $queryNameGenerator->generateParameterName("author");

            $condition = sprintf(
                "(%s OR %s.author = :%s)",
                $condition,
                $alias,
                $authorParameter,
            );
            $queryBuilder->setParameter($authorParameter, $user);
        }

        $queryBuilder->andWhere($condition);
    }
}
