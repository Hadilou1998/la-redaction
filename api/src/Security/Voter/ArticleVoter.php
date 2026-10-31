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
    public const SUBMIT = "ARTICLE_SUBMIT";
    public const PUBLISH = "ARTICLE_PUBLISH";
    public const REJECT = "ARTICLE_REJECT";
    public const RESUME = "ARTICLE_RESUME";
    public const DELETE = "ARTICLE_DELETE";

    public function __construct(
        private readonly AccessDecisionManagerInterface $accessDecisionManager,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array(
            $attribute,
            [self::EDIT, self::SUBMIT, self::PUBLISH, self::REJECT, self::RESUME, self::DELETE],
            true,
        ) && $subject instanceof Article;
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

        if ($attribute === self::DELETE) {
            return $this->accessDecisionManager->decide(
                $token,
                ["ROLE_JOURNALIST"],
            )
                && $article->getStatus() === ArticleStatus::Draft
                && $user->getId() !== null
                && $article->getAuthor()?->getId() === $user->getId();
        }

        if (in_array($attribute, [self::PUBLISH, self::REJECT], true)) {
            return $this->accessDecisionManager->decide(
                $token,
                ["ROLE_EDITOR"],
            );
        }

        if (in_array($attribute, [self::SUBMIT, self::RESUME], true)) {
            return $this->accessDecisionManager->decide(
                $token,
                ["ROLE_JOURNALIST"],
            )
                && $user->getId() !== null
                && $article->getAuthor()?->getId() === $user->getId();
        }

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
