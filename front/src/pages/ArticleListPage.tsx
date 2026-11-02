import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { getCategories, getPublicArticles } from "../api/articles"
import type { PublicArticleFilters } from "../api/articles"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
})

function ArticleListPage() {
  const [page, setPage] = useState(1)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [filters, setFilters] = useState<PublicArticleFilters>({})

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => getCategories(signal),
   })

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["public-articles", page, filters],
    queryFn: ({ signal }) => getPublicArticles(page, signal, filters),
  })

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">La Rédaction</p>
        <h1>Les derniers articles</h1>
        <p>Retrouvez les publications de notre rédaction.</p>
      </header>

      <form
        className="article-filters"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setFilters({
            title: title.trim(),
            category,
            order,
          })
        }}
      >
        <div>
          <label htmlFor="article-title">Rechercher dans le titre</label>
          <input
            id="article-title"
            type="search"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="article-category">Rubrique</label>
          <select
            id="article-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={categoriesQuery.isPending || categoriesQuery.isError}
          >
            <option value="">Toutes les rubriques</option>
            {categoriesQuery.data?.map((item) => (
              <option key={item.id} value={item["@id"]}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="article-order">Date de publication</label>
          <select
            id="article-order"
            value={order}
            onChange={(event) => {
              setOrder(event.target.value === "asc" ? "asc" : "desc")
            }}
          >
            <option value="desc">Plus récents d'abord</option>
            <option value="asc">Plus anciens d'abord</option>
          </select>
        </div>

        <button type="submit">Appliquer</button>

        <button
          type="button"
          onClick={() => {
            setTitle("")
            setCategory("")
            setOrder("desc")
            setFilters({})
            setPage(1)
          }}
        >
          Réinitialiser
        </button>
      </form>

      {categoriesQuery.isPending && (
        <p role="status">Chargement des rubriques...</p>
      )}

      {categoriesQuery.isError && (
        <section role="alert">
          <p>{categoriesQuery.error.message}</p>
          <button
            type="button"
            onClick={() => void categoriesQuery.refetch()}
            disabled={categoriesQuery.isFetching}
          >
            Réessayer de charger les rubriques
          </button>
        </section>
      )}

      {isPending && (
        <p role="status">Chargement des articles...</p>
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
            {data.totalItems > 1 ? "s" : ""} publié
            {data.totalItems > 1 ? "s" : ""}
          </p>

          {data.member.length === 0 ? (
            <p>Aucun article disponible sur cette page.</p>
          ) : (
            <section
              className="article-list"
              aria-label="Articles publiés"
            >
              {data.member.map((article) => (
                <article className='article-card' key={article.id}>
                  <p className="category">{article.category.name}</p>
                  <h2>
                    <Link to={`/articles/${article.id}`}>
                      {article.title}
                    </Link>
                  </h2>
                  <p>{article.chapo}</p>

                  <footer className="article-meta">
                    <span>Par {article.author.displayName}</span>

                    {article.publishedAt && (
                      <time dateTime={article.publishedAt}>
                        {dateFormatter.format(
                          new Date(article.publishedAt),
                        )}
                      </time>
                    )}
                  </footer>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      <nav className="pagination" aria-label="Pagination des articles">
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
          disabled={!data?.view?.next || isFetching || isError}
          onClick={() => setPage((current) => current + 1)}
        >
          Suivant
        </button>
      </nav>
    </main>
  )
}

export default ArticleListPage
