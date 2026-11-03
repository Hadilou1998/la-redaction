import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleDetail } from "../api/articles";
import { AuthContext } from "../auth/AuthContext";
import JournalistArticleDetailPage from "./JournalistArticleDetailPage";

const queryClients: QueryClient[] = [];

const category = {
    "@id": "/api/categories/1",
    id: 1,
    name: "Culture",
    slug: "culture",
};

function makeArticle(
    overrides: Partial<ArticleDetail> = {},
): ArticleDetail {
    return {
        "@id": "/api/articles/35",
        id: 35,
        title: "Une bibliothèque ouvre ses portes",
        slug: "une-bibliotheque-ouvre-ses-portes",
        chapo: "Une nouvelle bibliothèque dans le quartier.",
        body: "Des livres et des ateliers seront proposés.",
        status: "draft",
        publishedAt: null,
        rejectionReason: null,
        author: {
            id: 7,
            displayName: "Journaliste de test",
        },
        category,
        ...overrides,
    };
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/ld+json",
        },
    });
}

function mockApi(
    article: ArticleDetail,
    patchResponse?: () => Response,
) {
    const fetchMock = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url === "/api/articles/35" && method === "GET") {
                return jsonResponse(article);
            }

            if (url === "/api/categories?page=1" && method === "GET") {
                return jsonResponse({
                    member: [category],
                });
            }

            if (
                url === "/api/articles/35"
                && method === "PATCH"
                && patchResponse
            ) {
                return patchResponse();
            }

            throw new Error(`Requête inattendue : ${method} ${url}`);
        },
    );

    vi.stubGlobal("fetch", fetchMock);

    return fetchMock;
}

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
            },
            mutations: {
                retry: false,
            },
        },
    });

    queryClients.push(queryClient);

    queryClient.setQueryData(["own-articles", 7, 1], {
        totalItems: 1,
        member: [makeArticle()],
    });

    render(
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider
                value={{
                    token: "token-de-test",
                    user: {
                        id: 7,
                        email: "journalist@example.test",
                        displayName: "Journaliste de test",
                        roles: ["ROLE_JOURNALIST"],
                    },
                    signIn: vi.fn(async () => {}),
                    signOut: vi.fn(),
                }}
            >
                <MemoryRouter
                    initialEntries={["/journalist/articles/35"]}
                >
                    <Routes>
                        <Route
                            path="/journalist/articles/:id"
                            element={<JournalistArticleDetailPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </AuthContext.Provider>
        </QueryClientProvider>,
    );

    return queryClient;
}

async function openEditForm() {
    fireEvent.click(
        await screen.findByRole("button", { name: "Modifier" }),
    );

    await screen.findByLabelText("Titre");
}

afterEach(() => {
    cleanup();

    for (const queryClient of queryClients) {
        queryClient.clear();
    }

    queryClients.length = 0;
    vi.unstubAllGlobals();
});

describe("Détail personnel d'un article", () => {
    it("affiche le brouillon complet et transmet le jeton", async () => {
        const article = makeArticle();
        const fetchMock = mockApi(article);

        renderPage();

        expect(
            await screen.findByRole("heading", {
                level: 1,
                name: article.title,
            }),
        ).toBeInTheDocument();

        expect(screen.getByText("Brouillon")).toBeInTheDocument();
        expect(screen.getByText(article.chapo)).toBeInTheDocument();

        const content = screen.getByRole("region", {
            name: "Contenu de l’article",
        });

        expect(within(content).getByText(article.body)).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Modifier" }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles/35",
            expect.objectContaining({
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
            }),
        );
    });

    it("affiche le motif de refus sans proposer la modification", async () => {
        const article = makeArticle({
            status: "rejected",
            rejectionReason: "Veuillez compléter les sources.",
        });

        mockApi(article);
        renderPage();

        const rejection = await screen.findByRole("region", {
            name: "Motif de refus",
        });

        expect(rejection).toHaveTextContent(
            "Veuillez compléter les sources.",
        );

        expect(screen.getByText("Refusé")).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Modifier" }),
        ).not.toBeInTheDocument();
    });

    it.each(["submitted", "published"] as const)(
        "ne propose pas de modification pour le statut %s",
        async (status) => {
            const article = makeArticle({ status });

            mockApi(article);
            renderPage();

            await screen.findByRole("heading", {
                level: 1,
                name: article.title,
            });

            expect(
                screen.queryByRole("button", { name: "Modifier" }),
            ).not.toBeInTheDocument();
        },
    );

    it("n'affiche pas le formulaire pour un brouillon d'un autre auteur", async () => {
        // Réponse simulée pour vérifier la condition d'affichage du front.
        // Le contrôle d'accès réel reste assuré par l'API.
        const article = makeArticle({
            author: {
                id: 8,
                displayName: "Autre journaliste",
            },
        });

        mockApi(article);
        renderPage();

        await screen.findByRole("heading", {
            level: 1,
            name: article.title,
        });

        expect(
            screen.queryByRole("button", { name: "Modifier" }),
        ).not.toBeInTheDocument();
    });

    it("affiche une erreur lorsque l'article est inaccessible", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => jsonResponse({}, 404)),
        );

        renderPage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Article introuvable ou inaccessible.",
        );

        expect(
            screen.queryByRole("button", { name: "Modifier" }),
        ).not.toBeInTheDocument();
    });
});

describe("Modification d'un brouillon", () => {
    it("préremplit le formulaire, enregistre et actualise les caches", async () => {
        const article = makeArticle();

        const updatedArticle = makeArticle({
            title: "La bibliothèque accueille ses premiers lecteurs",
            chapo: "Une ouverture attendue dans le quartier.",
            body: "Des ateliers de lecture sont désormais disponibles.",
        });

        const fetchMock = mockApi(
            article,
            () => jsonResponse(updatedArticle),
        );

        const queryClient = renderPage();

        await openEditForm();

        expect(screen.getByLabelText("Titre")).toHaveValue(article.title);
        expect(screen.getByLabelText("Chapô (facultatif)")).toHaveValue(
            article.chapo,
        );
        expect(screen.getByLabelText("Contenu")).toHaveValue(article.body);
        expect(screen.getByLabelText("Rubrique")).toHaveValue(
            category["@id"],
        );

        fireEvent.change(screen.getByLabelText("Titre"), {
            target: { value: `  ${updatedArticle.title}  ` },
        });

        fireEvent.change(screen.getByLabelText("Chapô (facultatif)"), {
            target: { value: `  ${updatedArticle.chapo}  ` },
        });

        fireEvent.change(screen.getByLabelText("Contenu"), {
            target: { value: `  ${updatedArticle.body}  ` },
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Enregistrer les modifications",
            }),
        );

        expect(
            await screen.findByText(
                "Les modifications ont été enregistrées.",
            ),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles/35",
            {
                method: "PATCH",
                headers: {
                    Accept: "application/ld+json",
                    "Content-Type": "application/merge-patch+json",
                    Authorization: "Bearer token-de-test",
                },
                body: JSON.stringify({
                    title: updatedArticle.title,
                    chapo: updatedArticle.chapo,
                    body: updatedArticle.body,
                    category: category["@id"],
                }),
            },
        );

        expect(
            screen.getByRole("heading", {
                level: 1,
                name: updatedArticle.title,
            }),
        ).toBeInTheDocument();

        expect(
            within(
                screen.getByRole("region", {
                    name: "Contenu de l’article",
                }),
            ).getByText(updatedArticle.body),
        ).toBeInTheDocument();

        expect(screen.queryByLabelText("Titre")).not.toBeInTheDocument();

        expect(
            queryClient.getQueryData(["journalist-article", 7, "35"]),
        ).toEqual(updatedArticle);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(true);
    });

    it("conserve les champs et les caches après une erreur de validation", async () => {
        const article = makeArticle();

        mockApi(
            article,
            () => jsonResponse({
                violations: [{
                    propertyPath: "category",
                    message: "Cette rubrique n'est plus disponible.",
                }],
            }, 422),
        );

        const queryClient = renderPage();

        await openEditForm();

        const title = "Un titre modifié conservé après erreur";
        const body = "Un contenu modifié conservé après erreur.";

        fireEvent.change(screen.getByLabelText("Titre"), {
            target: { value: title },
        });

        fireEvent.change(screen.getByLabelText("Contenu"), {
            target: { value: body },
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: "Enregistrer les modifications",
            }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Cette rubrique n'est plus disponible.",
        );

        expect(screen.getByLabelText("Titre")).toHaveValue(title);
        expect(screen.getByLabelText("Contenu")).toHaveValue(body);
        expect(screen.getByLabelText("Chapô (facultatif)")).toHaveValue(
            article.chapo,
        );
        expect(screen.getByLabelText("Rubrique")).toHaveValue(
            category["@id"],
        );

        expect(
            screen.getByRole("button", {
                name: "Enregistrer les modifications",
            }),
        ).toBeEnabled();

        expect(
            screen.queryByText("Les modifications ont été enregistrées."),
        ).not.toBeInTheDocument();

        expect(
            queryClient.getQueryData(["journalist-article", 7, "35"]),
        ).toEqual(article);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(false);
    });

    it("abandonne les modifications lors de l'annulation", async () => {
        const article = makeArticle();
        const fetchMock = mockApi(article);

        renderPage();

        await openEditForm();

        fireEvent.change(screen.getByLabelText("Titre"), {
            target: { value: "Une modification à abandonner" },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Annuler" }),
        );

        expect(screen.queryByLabelText("Titre")).not.toBeInTheDocument();

        await openEditForm();

        expect(screen.getByLabelText("Titre")).toHaveValue(article.title);

        expect(
            fetchMock.mock.calls.some(
                ([, options]) => options?.method === "PATCH",
            ),
        ).toBe(false);
    });
});