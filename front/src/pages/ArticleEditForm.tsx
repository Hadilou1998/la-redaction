import { useState } from "react";
import type { FormEvent } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { getCategories, updateArticle } from "../api/articles";
import type { ArticleDetail, ArticleInput } from "../api/articles";
import { useAuth } from "../auth/AuthContext";

interface ArticleEditFormProps {
    article: ArticleDetail;
    onCancel: () => void;
    onSaved: () => void;
}

export default function ArticleEditForm({
    article,
    onCancel,
    onSaved,
}: ArticleEditFormProps) {
    const { user, token } = useAuth();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState(article.title);
    const [chapo, setChapo] = useState(article.chapo);
    const [body, setBody] = useState(article.body);
    const [category, setCategory] = useState(article.category["@id"]);

    const categoriesQuery = useQuery({
        queryKey: ["categories"],
        queryFn: ({ signal }) => getCategories(signal),
        retry: false,
    });

    const update = useMutation({
        mutationFn: (input: ArticleInput) => {
            if (!token || !user) {
                throw new Error("Veuillez vous connecter.");
            }

            if (
                article.status !== "draft"
                || article.author.id !== user.id
            ) {
                throw new Error(
                    "Vous pouvez modifier uniquement vos propres brouillons.",
                );
            }

            return updateArticle(String(article.id), input, token);
        },
        retry: false,
        onSuccess: async (updateArticle) => {
            queryClient.setQueryData(
                ["journalist-article", user?.id, String(article.id)],
                updateArticle,
            );

            await queryClient.invalidateQueries({
                queryKey: ["own-articles"],
            });

            onSaved();
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (update.isPending) {
            return;
        }

        update.mutate({
            title: title.trim(),
            chapo: chapo.trim(),
            body: body.trim(),
            category: category.trim(),
        });
    }

    return (
        <section aria-labelledby="edit-heading">
            <h2 id="edit-heading">Modifier le brouillon</h2>

            {categoriesQuery.isPending && (
                <p role="status">Chargement des rubriques...</p>
            )}

            {categoriesQuery.isError && (
                <section role="alert">
                    <p>{categoriesQuery.error.message}</p>
                    <button
                        type="button"
                        disabled={categoriesQuery.isFetching}
                        onClick={() => void categoriesQuery.refetch()}
                    >
                        Réessayer
                    </button>
                </section>
            )}

            {categoriesQuery.data?.length === 0 && (
                <p>Aucune rubrique disponible.</p>
            )}

            {update.isError && (
                <p role="alert">{update.error.message}</p>
            )}

            {categoriesQuery.data
                && categoriesQuery.data.length > 0
                && !categoriesQuery.isError && (
                    <form onSubmit={handleSubmit}>
                        <fieldset disabled={update.isPending}>
                            <legend>Contenu de l’article</legend>

                            <p>
                                <label htmlFor="edit-title">Titre</label>
                                <br />
                                <input
                                    id="edit-title"
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    minLength={10}
                                    maxLength={150}
                                    required
                                />
                            </p>

                            <p>
                                <label htmlFor="edit-chapo">
                                    Chapô (facultatif)
                                </label>
                                <br />
                                <textarea
                                    id="edit-chapo"
                                    value={chapo}
                                    onChange={(event) =>
                                        setChapo(event.target.value)
                                    }
                                    maxLength={300}
                                    rows={3}
                                />
                            </p>

                            <p>
                                <label htmlFor="edit-body">Contenu</label>
                                <br />
                                <textarea
                                    id="edit-body"
                                    value={body}
                                    onChange={(event) =>
                                        setBody(event.target.value)
                                    }
                                    rows={12}
                                    required
                                />
                            </p>

                            <p>
                                <label htmlFor="edit-category">
                                    Rubrique
                                </label>
                                <br />
                                <select
                                    id="edit-category"
                                    value={category}
                                    onChange={(event) =>
                                        setCategory(event.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Choisir une rubrique
                                    </option>

                                    {categoriesQuery.data.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item["@id"]}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </p>

                            <button type="submit">
                                {update.isPending
                                    ? "Enregistrement..."
                                    : "Enregistrer les modifications"}
                            </button>
                        </fieldset>
                    </form>
                )}

            <p>
                <button
                    type="button"
                    disabled={update.isPending}
                    onClick={onCancel}
                >
                    Annuler
                </button>
            </p>
        </section>
    );
}
