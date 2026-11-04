import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getSubmittedArticles } from "../api/articles";
import { useAuth } from "../auth/AuthContext";

export default function EditorDashboardPage() {
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
        queryKey: ["submitted-articles", page],
        queryFn: ({ signal }) => {
            if (!token) {
                throw new Error("Veuillez vous connecter.");
            }

            return getSubmittedArticles(token, page, signal);
        },
        enabled: Boolean(token),
        retry: false,
    });

    return (
        <main className="page">
            <header className="page-header">
                <p className="eyebrow">Espace rédacteur en chef</p>
                <h1>Articles à valider</h1>
                <p>Bienvenue, {user?.displayName} !</p>
                <p>Retrouvez les articles soumis par les journalistes.</p>
            </header>

            {isPending && (
                <p role="status">Chargement des articles soumis...</p>
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
                        {data.totalItems > 1 ? "s" : ""} à valider
                    </p>

                    {data.member.length === 0 ? (
                        <p>Aucun article soumis sur cette page.</p>
                    ) : (
                        <section
                            className="article-list"
                            aria-label="Articles soumis"
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
                                        Auteur : {article.author.displayName}
                                    </p>

                                    <p>
                                        Statut : <strong>Soumis</strong>
                                    </p>

                                    <p>
                                        <Link to={`/editor/articles/${article.id}`}>
                                            Consulter l'article
                                        </Link>
                                    </p>
                                </article>
                            ))}
                        </section>
                    )}

                    <nav
                        className="pagination"
                        aria-label="Pagination des articles soumis"
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
