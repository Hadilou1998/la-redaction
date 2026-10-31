<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Article;
use App\Entity\User;
use App\Enum\ArticleStatus;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AccessDecisionManagerInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class ArticleVoter extends Voter
{
    public const EDIT = "ARTICLE_EDIT";

    public function __construct(
        private readonly AccessDecisionManagerInterface $accessDecisionManager,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::EDIT && $subject instanceof Article;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null,
    ): bool {
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        /** @var Article $article */
        $article = $subject;

        if ($this->accessDecisionManager->decide($token, ["ROLE_EDITOR"])) {
            return $article->getStatus() === ArticleStatus::Submitted;
        }

        if (!$this->accessDecisionManager->decide($token, ["ROLE_JOURNALIST"])) {
            return false;
        }

        return $article->getStatus() === ArticleStatus::Draft
            && $user->getId() !== null
            && $article->getAuthor()?->getId() === $user->getId();
    }
}
