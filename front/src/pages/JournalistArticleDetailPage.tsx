import { useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    deleteArticle,
    getAuthenticatedArticle,
    resumeArticle,
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
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const navigate = useNavigate();
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

    const resumption = useMutation({
        mutationFn: () => {
            if (!id || !token || !user) {
                throw new Error("Veuillez vous connecter.");
            }

            if (
                !article
                || article.status !== "rejected"
                || article.author.id !== user.id
            ) {
                throw new Error(
                    "Vous pouvez rétablir uniquement vos propres articles refusés.",
                );
            }

            return resumeArticle(id, token);
        },
        retry: false,
        onSuccess: async (resumedArticle) => {
            queryClient.setQueryData(
                ["journalist-article", user?.id, id],
                resumedArticle,
            );

            await queryClient.invalidateQueries({
                queryKey: ["own-articles"],
            });

            setIsEditing(false);
            setSaved(false);
        },
    });

    function handleResumeArticle() {
        if (resumption.isPending) {
            return;
        }

        setSaved(false);
        resumption.mutate();
    }

    const deletion = useMutation({
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
                    "Vous pouvez supprimer uniquement vos propres articles soumis.",
                );
            }

            return deleteArticle(id, token);
        },
        retry: false,
        onSuccess: async () => {
            queryClient.removeQueries({
                queryKey: ["journalist-article", user?.id, id],
            });

            await queryClient.invalidateQueries({
                queryKey: ["own-articles"],
            });

            navigate("/journalist", { replace: true });
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

                    {resumption.isSuccess && (
                        <p role="status">
                            L'article a été repris en brouillon.
                        </p>
                    )}

                    {resumption.isError && (
                        <p role="alert">{resumption.error.message}</p>
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

                                    {!isConfirmingDelete ? (
                                        <button
                                            type="button"
                                            disabled={submission.isPending || deletion.isPending}
                                            onClick={() => {
                                                deletion.reset();
                                                setIsConfirmingDelete(true);
                                            }}
                                        >
                                            Supprimer le brouillon
                                        </button>
                                    ) : (
                                        <div>
                                            <p>
                                                Voulez-vous vraiment supprimer ce brouillon ?
                                                Cette action est définitive.
                                            </p>

                                            <button
                                                type="button"
                                                disabled={deletion.isPending}
                                                onClick={() => deletion.mutate()}
                                            >
                                                {deletion.isPending
                                                    ? "Suppression..."
                                                    : "Confirmer la suppression"}
                                            </button>

                                            {" "}

                                            <button
                                                type="button"
                                                disabled={deletion.isPending}
                                                onClick={() => setIsConfirmingDelete(false)}
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    )}

                                    {deletion.isError && (
                                        <p role="alert">{deletion.error.message}</p>
                                    )}

                                </div>
                            )
                        )
                    }

                    {article.status === "rejected"
                        && article.author.id === user?.id && (
                            <div>
                                <p>
                                    Cet article a été refusé. Vous pouvez le reprendre
                                    en brouillon pour le corriger.
                                </p>

                                <button
                                    type="button"
                                    disabled={resumption.isPending}
                                    onClick={handleResumeArticle}
                                >
                                    {resumption.isPending
                                        ? "Reprise..."
                                        : "Reprendre le brouillon"}
                                </button>
                            </div>
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
