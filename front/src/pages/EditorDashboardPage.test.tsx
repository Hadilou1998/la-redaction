
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import type { ArticleSummary } from "../api/articles";
import EditorDashboardPage from "./EditorDashboardPage";

const queryClients: QueryClient[] = [];

afterEach(() => {
    cleanup();

    for (const queryClient of queryClients) {
        queryClient.clear();
    }

    queryClients.length = 0;
    vi.unstubAllGlobals();
});

function renderDashboard() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

    queryClients.push(queryClient);

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider
                value={{
                    token: "token-editeur-test",
                    user: {
                        id: 10,
                        email: "editor@example.test",
                        displayName: "Rédacteur en chef de test",
                        roles: ["ROLE_EDITOR"],
                    },
                    signIn: vi.fn(async () => {}),
                    signOut: vi.fn(),
                }}
            >
                <MemoryRouter initialEntries={["/editor"]}>
                    <EditorDashboardPage />
                </MemoryRouter>
            </AuthContext.Provider>
        </QueryClientProvider>,
    );
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/ld+json",
        },
    });
}

function article(
    id: number,
    title: string,
    authorName = "Journaliste de test",
): ArticleSummary {
    return {
        "@id": `/api/articles/${id}`,
        id,
        title,
        slug: `article-${id}`,
        chapo: "Une introduction de démonstration.",
        status: "submitted",
        publishedAt: null,
        author: {
            id: 7,
            displayName: authorName,
        },
        category: {
            "@id": "/api/categories/1",
            id: 1,
            name: "Culture",
            slug: "culture",
        },
    };
}

describe("Liste des articles soumis au rédacteur en chef", () => {
    it("affiche les articles, leurs auteurs et leurs rubriques", async () => {
        const fetchMock = vi.fn(async () =>
            jsonResponse({
                totalItems: 2,
                member: [
                    article(1, "Premier article soumis", "Alice"),
                    article(2, "Deuxième article soumis", "Karim"),
                ],
            }),
        );

        vi.stubGlobal("fetch", fetchMock);

        renderDashboard();

        const list = await screen.findByRole("region", {
            name: "Articles soumis",
        });

        expect(within(list).getAllByRole("article")).toHaveLength(2);
        expect(within(list).getByText("Auteur : Alice")).toBeInTheDocument();
        expect(within(list).getByText("Auteur : Karim")).toBeInTheDocument();
        expect(within(list).getAllByText("Culture")).toHaveLength(2);
        expect(screen.getByText("2 articles à valider")).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles?status=submitted&page=1",
            expect.objectContaining({
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-editeur-test",
                },
            }),
        );

        expect(
            within(list).getAllByRole("link", {
                name: "Consulter l'article",
            }),
        ).toHaveLength(2);
    });

    it("permet de passer à la page suivante et de revenir", async () => {
        const firstPage = {
            totalItems: 2,
            member: [article(1, "Premier article soumis")],
            view: {
                next: "/api/articles?status=submitted&page=2",
            },
        };

        const secondPage = {
            totalItems: 2,
            member: [article(2, "Deuxième article soumis")],
            view: {
                previous: "/api/articles?status=submitted&page=1",
            },
        };

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input), "http://localhost");

            return jsonResponse(
                url.searchParams.get("page") === "2"
                    ? secondPage
                    : firstPage,
            );
        });

        vi.stubGlobal("fetch", fetchMock);

        renderDashboard();

        expect(
            await screen.findByRole("heading", {
                name: "Premier article soumis",
            }),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

        expect(
            await screen.findByRole("heading", {
                name: "Deuxième article soumis",
            }),
        ).toBeInTheDocument();

        expect(screen.getByText("Page 2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Précédent" }));

        expect(
            await screen.findByRole("heading", {
                name: "Premier article soumis",
            }),
        ).toBeInTheDocument();

        expect(screen.getByText("Page 1")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles?status=submitted&page=2",
            expect.any(Object),
        );
    });

    it("affiche un message lorsqu'aucun article n'est soumis", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                jsonResponse({
                    totalItems: 0,
                    member: [],
                }),
            ),
        );

        renderDashboard();

        expect(
            await screen.findByText("Aucun article soumis sur cette page."),
        ).toBeInTheDocument();

        expect(screen.queryByRole("article")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Suivant" }),
        ).toBeDisabled();
    });

    it("permet de réessayer après une erreur serveur", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({}, 500))
            .mockImplementation(async () =>
                jsonResponse({
                    totalItems: 1,
                    member: [article(3, "Article chargé après erreur")],
                }),
            );

        vi.stubGlobal("fetch", fetchMock);

        renderDashboard();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Impossible de charger vos articles soumis (HTTP 500).",
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Essayer à nouveau" }),
        );

        expect(
            await screen.findByRole("heading", {
                name: "Article chargé après erreur",
            }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("affiche une erreur si l'accès aux articles est interdit", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => jsonResponse({}, 403)),
        );

        renderDashboard();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Vous n'avez pas la permission d'accéder aux articles soumis.",
        );
    });
});
