<?php

declare(strict_types=1);

namespace App\Enum;

enum ArticleStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Published = 'published';
    case Rejected = 'rejected';
}
