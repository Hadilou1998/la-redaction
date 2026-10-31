<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Enum\ArticleStatus;
use App\Security\Voter\ArticleVoter;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * @implements ProcessorInterface<Article, Article>
 */
final class ArticleSubmitProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: "api_platform.doctrine.orm.state.persist_processor")]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security,
    ) {
    }

    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = [],
    ): Article {
        if (!$data instanceof Article) {
            throw new \LogicException("Un article est attendu.");
        }

        if (!$this->security->isGranted(ArticleVoter::SUBMIT, $data)) {
            throw new AccessDeniedException(
                "Vous ne pouvez pas soumettre cet article."
            );
        }

        $data->setStatus(ArticleStatus::Submitted);

        return $this->persistProcessor->process(
            $data,
            $operation,
            $uriVariables,
            $context,
        );
    }
}
