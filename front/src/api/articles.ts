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

export interface PublicArticleFilters {
    title?: string;
    category?: string;
    order?: "asc" | "desc";
}

export async function getPublicArticles(
    page: number,
    signal?: AbortSignal,
    filters: PublicArticleFilters = {},
) : Promise<ArticleCollection> {
    const parameters = new URLSearchParams({
        page: String(page),
        status: "published",
    });

    const title = filters.title?.trim();

    if (title) {
        parameters.set("title", title);
    }

    if (filters.category) {
        parameters.set("category", filters.category);
    }

    if (filters.order) {
        parameters.set("order[publishedAt]", filters.order);
    }

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

export interface ArticleDetail extends ArticleSummary {
    body: string;
}

export async function getArticle(
    id: string,
    signal?: AbortSignal,
) : Promise<ArticleDetail> {
    const response = await fetch(
        `/api/articles/${encodeURIComponent(id)}`,
        {
            headers: {
                Accept: "application/ld+json",
            },
            signal,
        },
    );

    if (response.status === 404) {
        throw new Error("Article introuvable ou inaccessible.");
    }

    if (!response.ok) {
        throw new Error(
            `Impossible de charger l'article ${id} (HTTP ${response.status}).`,
        );
    }

    return response.json();
}

export interface Category {
    "@id": string;
    id: number;
    name: string;
    slug: string;
}

export interface CategoryCollection {
    member: Category[];
    view?: {
        "next"?: string;
    }
}

export async function getCategories(
    signal?: AbortSignal,
) : Promise<Category[]> {
    const categories: Category[] = [];
    let page = 1;

    while (true) {
        const response = await fetch(`/api/categories?page=${page}`, {
            headers: {
                Accept: "application/ld+json",
            },
            signal,
        });

        if (!response.ok) {
            throw new Error(
                `Impossible de charger les rubriques (HTTP ${response.status}).`,
            );
        }

        const collection: CategoryCollection = await response.json();
        categories.push(...collection.member);

        if (!collection.view?.next) {
            return categories;
        }

        page++;
    }
}
