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
    rejectionReason?: string | null;
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

export async function getOwnArticles(
    authorId: number,
    token: string,
    page: number,
    signal?: AbortSignal,
) : Promise<ArticleCollection> {
    const parameters = new URLSearchParams({
        author: String(authorId),
        page: String(page),
    });

    const response = await fetch(`/api/articles?${parameters}`, {
        headers: {
            Accept: "application/ld+json",
            Authorization: `Bearer ${token}`,
        },
        signal,
    });

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }
    if (!response.ok) {
        throw new Error(
            `Impossible de charger vos articles (HTTP ${response.status}).`,
        );
    }

    return response.json();
}

export interface ArticleInput {
    title: string;
    chapo: string;
    body: string;
    category: string;
}

export async function createArticle(
    input: ArticleInput,
    token: string,
) : Promise<ArticleDetail> {
    const response = await fetch(`/api/articles`, {
        method: "POST",
        headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/ld+json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
    });

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

    if (!response.ok) {
        const fallback =
            `Impossible de créer l'article (HTTP ${response.status}).`;

        const data: unknown = await response.json().catch(() => null);

        if (typeof data === "object" && data !== null) {
            if ("violations" in data && Array.isArray(data.violations)) {
                const messages = data.violations.flatMap(
                    (violation: unknown) => {
                        if (
                            typeof violation === "object"
                            && violation !== null
                            && "message" in violation
                            && typeof violation.message === "string"
                        ) {
                            return [violation.message];
                        }

                        return [];
                    }
                );

                if (messages.length > 0) {
                    throw new Error(messages.join(" "));
                }
            }

            if ("detail" in data && typeof data.detail === "string") {
                throw new Error(data.detail || fallback);
            }
        }

        throw new Error(fallback);
    }

    return response.json();
}

export async function getAuthenticatedArticle (
    id: string,
    token: string,
    signal?: AbortSignal,
) : Promise<ArticleDetail> {
    const response = await fetch(
        `/api/articles/${encodeURIComponent(id)}`,
        {
            headers: {
                Accept: "application/ld+json",
                Authorization: `Bearer ${token}`,
            },
            signal,
        },
    );

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

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

export async function updateArticle(
    id: string,
    input: ArticleInput,
    token: string,
) : Promise<ArticleDetail> {
    const response = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: {
            Accept: "application/ld+json",
            "Content-Type": "application/merge-patch+json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
    });

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

    if (!response.ok) {
        const fallback =
            `Impossible de mettre à jour l'article ${id} (HTTP ${response.status}).`;

        const data: unknown = await response.json().catch(() => null);

        if (typeof data === "object" && data !== null) {
            if ("violations" in data && Array.isArray(data.violations)) {
                const messages = data.violations.flatMap(
                    (violation: unknown) => {
                        if (
                            typeof violation === "object"
                            && violation !== null
                            && "message" in violation
                            && typeof violation.message === "string"
                        ) {
                            return [violation.message];
                        }

                        return [];
                    },
                );

                if (messages.length > 0) {
                    throw new Error(messages.join(" "));
                }
            }

            if ("detail" in data && typeof data.detail === "string") {
                throw new Error(data.detail || fallback);
            }
        }

        throw new Error(fallback);
    }

    return response.json();
}

export async function submitArticle(
    id: string,
    token: string,
) : Promise<ArticleDetail> {
    const response = await fetch(`/api/articles/${id}/submit`,
        {
            method: "POST",
            headers: {
                Accept: "application/ld+json",
                Authorization: `Bearer ${token}`,
            },
        },
    );

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

    if (response.status === 404) {
        throw new Error("Article introuvable ou inaccessible.");
    }

    if (response.status === 403) {
        throw new Error("Vous n'avez pas la permission de soumettre cet article.");
    }

    if (!response.ok) {
        const fallback =
            `Impossible de soumettre l'article ${id} (HTTP ${response.status}).`;

        const data: unknown = await response.json().catch(() => null);

        if (
            typeof data === "object"
            && data !== null
            && "detail" in data
            && typeof data.detail === "string"
        ) {
            throw new Error(data.detail || fallback);
        }

        throw new Error(fallback);
    }

    return response.json();
}
