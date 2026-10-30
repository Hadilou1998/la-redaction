<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Entity\User;
use App\Enum\ArticleStatus;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * @implements ProcessorInterface<Article, Article>
 */
final class ArticleCreateProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: "api_platform.doctrine.orm.state.persist_processor")]
        private readonly ProcessorInterface $persistProcessor,
        private readonly Security $security
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

        $user = $this->security->getUser();
        if (
            !$user instanceof User
            || !$this->security->isGranted("ROLE_JOURNALIST")
        ) {
            throw new AccessDeniedException(
                "Seul un journaliste peut créer un article.",
            );
        }
        $data->setAuthor($user);
        $data->setStatus(ArticleStatus::Draft);
        $data->setPublishedAt(null);
        $data->setRejectionReason(null);

        return $this->persistProcessor->process(
            $data,
            $operation,
            $uriVariables,
            $context
        );
    }
}
