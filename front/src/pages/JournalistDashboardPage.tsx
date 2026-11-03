import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOwnArticles } from "../api/articles";
import type { ArticleSummary } from "../api/articles";
import { useAuth } from "../auth/AuthContext";

const statusLabels: Record<ArticleSummary["status"], string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    published: "Publié",
    rejected: "Refusé",
};

export default function JournalistDashboardPage() {
    const { user, token } = useAuth();
    const [page, setPage] = useState(1);

    const {
        data,
        isPending,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["own-articles", user?.id, page],
        queryFn: ({ signal }) => {
            if (!user || !token) {
                throw new Error("Veuillez vous connecter.");
            }

            return getOwnArticles(user.id, token, page, signal);
        },
        enabled: Boolean(user && token),
        retry: false,
    });

    return (
        <main className="page">
            <header className="page-header">
                <p className="eyebrow">Espace journaliste</p>
                <h1>Mes articles</h1>
                <p>Retrouvez vos articles et leur statut.</p>
            </header>

            {isPending && (
                <p role="status">Chargement de vos articles...</p>
            )}

            {isError && (
                <section role="alert">
                    <p>{error.message}</p>

                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                    >
                        {isFetching ? "Chargement..." : "Essayer à nouveau"}
                    </button>
                </section>
            )}

            {data && !isError && (
                <>
                    <p role="status">
                        {data.totalItems} article
                        {data.totalItems > 1 ? "s" : ""}
                    </p>

                    {data.member.length === 0 ? (
                        <p>Aucun article disponible sur cette page.</p>
                    ) : (
                        <section
                            className="article-list"
                            aria-label="Mes articles"
                        >
                            {data.member.map((article) => (
                                <article
                                    className="article-card"
                                    key={article.id}
                                >
                                    <p className="category">
                                        {article.category.name}
                                    </p>

                                    <h2>{article.title}</h2>
                                    <p>{article.chapo}</p>
                                    <p>
                                        Statut :{" "}
                                        <strong>
                                            {statusLabels[article.status]}
                                        </strong>
                                    </p>
                                </article>
                            ))}
                        </section>
                    )}

                    <nav
                        className="pagination"
                        aria-label="Pagination de mes articles"
                    >
                        <button
                            type="button"
                            disabled={page === 1 || isFetching}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            Précédent
                        </button>

                        <span>Page {page}</span>
                        <button
                            type="button"
                            disabled={!data.view?.next || isFetching}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Suivant
                        </button>
                    </nav>
                </>
            )}
        </main>
    );
}
