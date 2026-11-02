import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import ArticleDetailPage from "./ArticleDetailPage"

function renderDetail(path: string) {
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
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route
                        path="/articles/:id"
                        element={<ArticleDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    )
}

describe("Détail public d'un article", () => {
    it("affiche le contenu complet d'un article publié", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    "@id": "/api/articles/42",
                    id: 42,
                    title: "Un article publié de démonstration",
                    slug: "un-article-publie-de-demonstration",
                    chapo: "Le résumé de cet article.",
                    body: "Voici le corps complet de cet article.",
                    status: "published",
                    publishedAt: "2026-10-31T12:00:00+00:00",
                    author: {
                        id: 1,
                        displayName: "Journaliste de test",
                    },
                    category: {
                        "@id": "/api/categories/1",
                        id: 1,
                        name: "Culture",
                        slug: "culture",
                    },
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/ld+json',
                    },
                },
            ),
        )

        vi.stubGlobal("fetch", fetchMock)

        renderDetail("/articles/42")

        expect(
            await screen.findByRole("heading", {
                level: 1,
                name: "Un article publié de démonstration",
            })
        ).toBeInTheDocument()

        expect(
            await screen.findByText("Le résumé de cet article.")
        ).toBeInTheDocument()

        expect(
            await screen.findByText("Voici le corps complet de cet article.")
        ).toBeInTheDocument()

        expect(screen.getByText("Culture")).toBeInTheDocument()
        expect(
            screen.getByText("Par Journaliste de test"),
        ).toBeInTheDocument()

        expect(
            screen.getByRole("link", { name: /retour/i }),
        ).toHaveAttribute("href", "/")

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles/42",
            expect.objectContaining({
                headers: {
                    Accept: "application/ld+json",
                },
            }),
        )
    })

    it("affiche un message lorsque l'API répond 404", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        status: 404,
                        detail: "Not Found",
                    }),
                    {
                        status: 404,
                        headers: {
                            "Content-Type": "application/problem+json",
                        },
                    },
                ),
            ),
        )

        renderDetail("/articles/999999")

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Article introuvable ou inaccessible.",
        )

        expect(
            screen.queryByRole("heading", { level: 1 }),
        ).not.toBeInTheDocument()

        expect(
            screen.getByRole("link", { name: /retour/i }),
        ).toHaveAttribute("href", "/")

        expect(
            screen.getByRole("button", { name: /réessayer/i }),
        ).toBeEnabled()
    })
})
