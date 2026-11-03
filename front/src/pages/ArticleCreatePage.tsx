import { useState } from "react";
import type { FormEvent } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createArticle, getCategories } from "../api/articles";
import type { ArticleInput } from "../api/articles";
import { useAuth } from "../auth/AuthContext";

export default function ArticleCreatePage() {
    const { token, signOut } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [chapo, setChapo] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState("");

    const categoriesQuery = useQuery({
        queryKey: ["categories"],
        queryFn: ({ signal }) => getCategories(signal),
        retry: false,
    });

    const creation = useMutation({
        mutationFn: (input: ArticleInput) => {
            if (!token) {
                throw new Error("Veuillez vous connecter.");
            }

            return createArticle(input, token);
        },
        retry: false,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["own-articles"],
            });

            navigate("/journalist", { replace: true });
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (creation.isPending) {
            return;
        }

        creation.mutate({
            title: title.trim(),
            chapo: chapo.trim(),
            body: body.trim(),
            category,
        });
    }

    function reconnect() {
        signOut();
        navigate("/login", { replace: true });
    }

    return (
        <main className="page">
            <Link to="/journalist">Retour à mes articles</Link>

            <header className="page-header">
                <p className="eyebrow">Espace journaliste</p>
                <h1>Créer un article</h1>
                <p>Votre article sera enregistré en brouillon.</p>
            </header>

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
                <p>
                    Aucune rubrique disponible. La création d’un article
                    nécessite une rubrique.
                </p>
            )}

            {creation.isError && (
                <section role="alert">
                    <p>{creation.error.message}</p>
                    <button type="button" onClick={reconnect}>
                        Se reconnecter
                    </button>
                </section>
            )}

            {categoriesQuery.data
                && categoriesQuery.data.length > 0
                && !categoriesQuery.isError && (
                    <form onSubmit={handleSubmit}>
                        <fieldset disabled={creation.isPending}>
                            <legend>Contenu de l’article</legend>

                            <p>
                                <label htmlFor="article-title">Titre</label>
                                <br />
                                <input
                                    id="article-title"
                                    name="title"
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
                                <label htmlFor="article-chapo">
                                    Chapô (facultatif)
                                </label>
                                <br />
                                <textarea
                                    id="article-chapo"
                                    name="chapo"
                                    value={chapo}
                                    onChange={(event) =>
                                        setChapo(event.target.value)
                                    }
                                    maxLength={300}
                                    rows={3}
                                />
                            </p>

                            <p>
                                <label htmlFor="article-body">Contenu</label>
                                <br />
                                <textarea
                                    id="article-body"
                                    name="body"
                                    value={body}
                                    onChange={(event) =>
                                        setBody(event.target.value)
                                    }
                                    rows={12}
                                    required
                                />
                            </p>

                            <p>
                                <label htmlFor="article-category">
                                    Rubrique
                                </label>
                                <br />
                                <select
                                    id="article-category"
                                    name="category"
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
                                {creation.isPending
                                    ? "Enregistrement..."
                                    : "Enregistrer le brouillon"}
                            </button>
                        </fieldset>
                    </form>
                )}
        </main>
    )
}
