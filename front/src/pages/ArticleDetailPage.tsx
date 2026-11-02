import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { getArticle } from "../api/articles"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
})

export default function ArticleDetailPage() {
    const { id } = useParams<{ id: string }>()

    const {
        data: article,
        isPending,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["public-article", id],
        queryFn: ({ signal }) => getArticle(id!, signal),
        enabled: Boolean(id),
        retry: false,
    })

    return (
        <main className="page">
            <Link to="/">Retour aux articles</Link>

            {isPending && (
                <p role="status">Chargement de l'article</p>
            )}

            {isError && (
                <section role="alert">
                    <p>{error.message}</p>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                    >
                        {isFetching ? "Chargement..." : "Réessayer"}
                    </button>
                </section>
            )}

            {article && !isError && (
                <article className="article-card article-detail">
                    <header>
                        <p className="category">{article.category.name}</p>
                        <h1>{article.title}</h1>

                        <div className="article-meta">
                            <span>Par {article.author.displayName}</span>

                            {article.publishedAt && (
                                <time dateTime={article.publishedAt}>
                                    {dateFormatter.format(
                                        new Date(article.publishedAt),
                                    )}
                                </time>
                            )}
                        </div>
                    </header>

                    <p className="article-chapo">{article.chapo}</p>
                    <div className="article-body">{article.body}</div>
                </article>
            )}
        </main>
    )
}
