import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPublicArticles } from './api/articles'
import './App.css'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
})

function App() {
  const [page, setPage] = useState(1)

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['public-articles', page],
    queryFn: ({ signal }) => getPublicArticles(page, signal),
  })

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">La Rédaction</p>
        <h1>Les derniers articles</h1>
        <p>Retrouvez les publications de notre rédaction.</p>
      </header>

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
            {isFetching ? 'Chargement...' : 'Essayer à nouveau'}
          </button>
        </section>
      )}

      {data && !isError && (
        <>
          <p role="status">
            {data.totalItems} article
            {data.totalItems > 1 ? 's' : ''} publié
            {data.totalItems > 1 ? 's' : ''}
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
                  <h2>{article.title}</h2>
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

export default App
