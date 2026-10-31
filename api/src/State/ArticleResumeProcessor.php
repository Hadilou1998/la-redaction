<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Enum\ArticleStatus;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * @implements ProcessorInterface<Article, Article>
 */
final class ArticleResumeProcessor implements ProcessorInterface
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

        if (!$this->security->isGranted("ARTICLE_RESUME", $data)) {
            throw new AccessDeniedException(
                "Seul l'auteur journaliste peut reprendre cet article.",
            );
        }

        if ($data->getStatus() !== ArticleStatus::Rejected) {
            throw new UnprocessableEntityHttpException(
                "Seul un article refusé peut être repris en brouillon.",
            );
        }

        $data->setStatus(ArticleStatus::Draft);

        return $this->persistProcessor->process(
            $data,
            $operation,
            $uriVariables,
            $context,
        );
    }
}
