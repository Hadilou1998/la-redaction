import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

function renderApp() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>,
    )
}

function jsonResponse(data: unknown) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'Content-Type': 'application/ld+json',
        },
    })
}

function article(id: number, title: string) {
    return {
        '@id': `/api/articles/${id}`,
        id,
        title,
        slug: `article-${id}`,
        chapo: 'Une introduction de démonstration.',
        status: 'published',
        publishedAt: '2026-10-31T12:00:00+00:00',
        author: {
            id: 1,
            displayName: 'Journaliste de test',
        },
        category: {
            '@id': '/api/categories/1',
            id: 1,
            name: 'Culture',
            slug: 'culture',
        },
    }
}

describe('Liste publique des articles', () => {
    it('affiche un message lorsque la liste est vide', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({
                    totalItems: 0,
                    member: [],
                }),
            ),
        )

        renderApp()

        expect(
            await screen.findByText('Aucun article disponible sur cette page.'),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', { name: 'Précédent' }),
        ).toBeDisabled()

        expect(
            screen.getByRole('button', { name: 'Suivant' }),
        ).toBeDisabled()
    })

    it('permet de passer à la page suivante et de revenir', async () => {
        const firstPage = {
            totalItems: 2,
            member: [article(1, 'Premier article publié')],
            view: {
                next: '/api/articles?page=2',
            },
        }

        const secondPage = {
            totalItems: 2,
            member: [article(2, 'Deuxième article publié')],
            view: {
                previous: '/api/articles?page=1',
            },
        }

        const fetchMock = vi.fn(
            async (input: RequestInfo | URL) => {
                const url = new URL(String(input), 'http://localhost')

                return jsonResponse(
                    url.searchParams.get('page') === '2'
                        ? secondPage
                        : firstPage,
                )
            },
        )

        vi.stubGlobal('fetch', fetchMock)

        renderApp()

        expect(
            await screen.findByRole('heading', {
                name: 'Premier article publié',
            }),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

        expect(
            await screen.findByRole('heading', {
                name: 'Deuxième article publié',
            }),
        ).toBeInTheDocument()

        expect(screen.getByText('Page 2')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Suivant' }),
        ).toBeDisabled()

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/articles?page=2&status=published',
            expect.objectContaining({
                headers: {
                    Accept: 'application/ld+json',
                },
            }),
        )

        fireEvent.click(screen.getByRole('button', { name: 'Précédent' }))

        expect(
            await screen.findByRole('heading', {
                name: 'Premier article publié',
            }),
        ).toBeInTheDocument()

        expect(screen.getByText('Page 1')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Précédent' }),
        ).toBeDisabled()
    })
})