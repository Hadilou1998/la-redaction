export interface ArticleSummary {
    "@id": string;
    id: number;
    title: string;
    slug: string;
    chapo: string;
    status: "draft" | "submitted" | "published" | "rejected";
    publishedAt?: string | null;
    author: {
        id: number;
        displayName: string;
    }
    category: {
        "@id": string;
        id: number;
        name: string;
        slug: string;
    }
}

export interface ArticleCollection {
    totalItems: number;
    member: ArticleSummary[];
    view?: {
        "next"?: string;
        "previous"?: string;
    }
}

export async function getPublicArticles(
    page: number,
    signal?: AbortSignal,
) : Promise<ArticleCollection> {
    const parameters = new URLSearchParams({
        page: String(page),
        status: "published",
    });

    const response = await fetch(`/api/articles?${parameters}`, {
        headers: {
            Accept: "application/ld+json",
        },
        signal,
    });

    if (!response.ok) {
        throw new Error(
            `Impossible de charger les articles (HTTP ${response.status}).`,
        );
    }

    return response.json();
}
