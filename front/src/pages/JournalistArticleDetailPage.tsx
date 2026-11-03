import { useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
    getAuthenticatedArticle,
    submitArticle,
} from "../api/articles";
import type { ArticleSummary } from "../api/articles";
import ArticleEditForm from "./ArticleEditForm";
import { useAuth } from "../auth/AuthContext";

const statusLabels: Record<ArticleSummary["status"], string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    published: "Publié",
    rejected: "Refusé",
};

export default function JournalistArticleDetailPage() {
    const { id } = useParams();
    const { token, user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const queryClient = useQueryClient();

    const {
        data: article,
        isPending,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["journalist-article", user?.id, id],
        queryFn: ({ signal }) => {
            if (!id || !token) {
                throw new Error("Veuillez vous connecter.");
            }

            return getAuthenticatedArticle(id, token!, signal);
        },
        enabled: Boolean(id && token && user),
        retry: false,
    });

    const submission = useMutation({
        mutationFn: () => {
            if (!id || !token || !user) {
                throw new Error("Veuillez vous connecter.");
            }

            if (
                !article
                || article.status !== "draft"
                || article.author.id !== user.id
            ) {
                throw new Error(
                    "Vous pouvez soumettre uniquement vos propres brouillons.",
                );
            }

            return submitArticle(id, token);
        },
        retry: false,
        onSuccess: async (submittedArticle) => {
            queryClient.setQueryData(
                ["journalist-article", user?.id, id],
                submittedArticle,
            );

            await queryClient.invalidateQueries({
                queryKey: ["own-articles"],
            });

            setIsEditing(false);
            setSaved(false);
        },
    });

    function handleSubmitArticle() {
        if (submission.isPending) {
            return;
        }

        setSaved(false);
        submission.mutate();
    }

    return (
        <main className="page">
            <Link to="/journalist">Retour à mes articles</Link>

            {isPending && (
                <p role="status">Chargement de l’article...</p>
            )}

            {isError && (
                <section role="alert">
                    <p>{error.message}</p>

                    <button
                        type="button"
                        disabled={isFetching}
                        onClick={() => void refetch()}
                    >
                        {isFetching ? "Chargement..." : "Réessayer"}
                    </button>
                </section>
            )}

            {article && !isError && (
                <article>
                    <header className="page-header">
                        <p className="eyebrow">Espace journaliste</p>
                        <p className="category">
                            {article.category.name}
                        </p>

                        <h1>{article.title}</h1>

                        <p>
                            Statut :{" "}
                            <strong>
                                {statusLabels[article.status]}
                            </strong>
                        </p>

                        <p>Par {article.author.displayName}</p>

                        {article.chapo && <p>{article.chapo}</p>}
                    </header>

                    {saved && (
                        <p role="status">Les modifications ont été enregistrées.</p>
                    )}

                    {submission.isSuccess && (
                        <p role="status">
                            L’article a été soumis au rédacteur en chef.
                        </p>
                    )}

                    {submission.isError && (
                        <p role="alert">{submission.error.message}</p>
                    )}

                    {article.status === "draft"
                        && article.author.id === user?.id && (
                            isEditing ? (
                                <ArticleEditForm
                                    key={article.id}
                                    article={article}
                                    onCancel={() => setIsEditing(false)}
                                    onSaved={() => {
                                        setIsEditing(false);
                                        setSaved(true);
                                    }}
                                />
                            ) : (
                                <div>
                                    <p>
                                        Vous pouvez modifier ce brouillon ou le soumettre
                                        au rédacteur en chef. Après soumission, vous ne
                                        pourrez plus le modifier tant qu'il sera en attente
                                        de validation.
                                    </p>

                                    <p>
                                        <button
                                            type="button"
                                            disabled={submission.isPending}
                                            onClick={() => {
                                                setSaved(false);
                                                submission.reset();
                                                setIsEditing(true);
                                            }}
                                        >
                                            Modifier
                                        </button>

                                        {" "}

                                        <button
                                            type="button"
                                            disabled={submission.isPending}
                                            onClick={handleSubmitArticle}
                                        >
                                            {submission.isPending
                                                ? "Soumission..."
                                                : "Soumettre"}
                                        </button>
                                    </p>
                                </div>
                            )
                        )
                    }

                    {article.rejectionReason && (
                        <section aria-labelledby="rejection-heading">
                            <h2 id="rejection-heading">
                                Motif de refus
                            </h2>

                            <p style={{ whiteSpace: "pre-wrap" }}>
                                {article.rejectionReason}
                            </p>
                        </section>
                    )}

                    <section aria-labelledby="body-heading">
                        <h2 id="body-heading">Contenu de l’article</h2>

                        <div style={{ whiteSpace: "pre-wrap" }}>
                            {article.body}
                        </div>
                    </section>
                </article>
            )}
        </main>
    );
}
