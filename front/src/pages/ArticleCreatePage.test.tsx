import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import ArticleCreatePage from "./ArticleCreatePage";

const queryClients: QueryClient[] = [];

afterEach(() => {
    cleanup();

    for (const queryClient of queryClients) {
        queryClient.clear();
    }

    queryClients.length = 0;
    vi.unstubAllGlobals();
});

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/ld+json",
        },
    });
}

function categoriesResponse() {
    return jsonResponse({
        member: [
            {
                "@id": "/api/categories/1",
                id: 1,
                name: "Culture",
                slug: "culture",
            },
        ],
    });
}

function renderCreatePage() {
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

    // Simule une liste personnelle déjà présente dans le cache.
    queryClient.setQueryData(["own-articles", 7, 1], {
        totalItems: 0,
        member: [],
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
                    initialEntries={["/journalist/articles/new"]}
                >
                    <Routes>
                        <Route
                            path="/journalist/articles/new"
                            element={<ArticleCreatePage />}
                        />
                        <Route
                            path="/journalist"
                            element={<h1>Mes articles</h1>}
                        />
                    </Routes>
                </MemoryRouter>
            </AuthContext.Provider>
        </QueryClientProvider>,
    );

    return queryClient;
}

const input = {
    title: "Une nouvelle bibliothèque ouvre ses portes",
    chapo: "Un nouvel espace de lecture pour les habitants.",
    body: "La bibliothèque propose des livres et des ateliers de lecture.",
    category: "/api/categories/1",
};

async function fillForm() {
    await screen.findByRole("option", { name: "Culture" });

    fireEvent.change(screen.getByLabelText("Titre"), {
        target: { value: input.title },
    });

    fireEvent.change(screen.getByLabelText("Chapô (facultatif)"), {
        target: { value: input.chapo },
    });

    fireEvent.change(screen.getByLabelText("Contenu"), {
        target: { value: input.body },
    });

    fireEvent.change(screen.getByLabelText("Rubrique"), {
        target: { value: input.category },
    });
}

describe("Création d'un article", () => {
    it("enregistre le brouillon et revient à la liste personnelle", async () => {
        const fetchMock = vi.fn(
            async (url: RequestInfo | URL, options?: RequestInit) => {
                if (String(url).startsWith("/api/categories?")) {
                    return categoriesResponse();
                }

                if (
                    String(url) === "/api/articles"
                    && options?.method === "POST"
                ) {
                    return jsonResponse({
                        "@id": "/api/articles/42",
                        id: 42,
                        title: input.title,
                        slug: "une-nouvelle-bibliotheque-ouvre-ses-portes",
                        chapo: input.chapo,
                        body: input.body,
                        status: "draft",
                        publishedAt: null,
                        author: {
                            id: 7,
                            displayName: "Journaliste de test",
                        },
                        category: {
                            "@id": "/api/categories/1",
                            id: 1,
                            name: "Culture",
                            slug: "culture",
                        },
                    }, 201);
                }

                throw new Error(`Requête inattendue : ${String(url)}`);
            },
        );

        vi.stubGlobal("fetch", fetchMock);

        const queryClient = renderCreatePage();
        await fillForm();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Enregistrer le brouillon",
            }),
        );

        expect(
            await screen.findByRole("heading", {
                name: "Mes articles",
            }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles",
            expect.objectContaining({
                method: "POST",
                headers: {
                    Accept: "application/ld+json",
                    "Content-Type": "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
                body: JSON.stringify(input),
            }),
        );

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(true);
    });

    it("affiche les erreurs de validation et conserve les champs", async () => {
        const message = "Cette rubrique ne peut pas être utilisée.";

        const fetchMock = vi.fn(
            async (url: RequestInfo | URL, options?: RequestInit) => {
                if (String(url).startsWith("/api/categories?")) {
                    return categoriesResponse();
                }

                if (
                    String(url) === "/api/articles"
                    && options?.method === "POST"
                ) {
                    return jsonResponse({
                        detail: "Les données envoyées sont invalides.",
                        violations: [
                            {
                                propertyPath: "category",
                                message,
                            },
                        ],
                    }, 422);
                }

                throw new Error(`Requête inattendue : ${String(url)}`);
            },
        );

        vi.stubGlobal("fetch", fetchMock);

        const queryClient = renderCreatePage();
        await fillForm();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Enregistrer le brouillon",
            }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            message,
        );

        expect(screen.getByLabelText("Titre")).toHaveValue(input.title);
        expect(screen.getByLabelText("Chapô (facultatif)")).toHaveValue(
            input.chapo,
        );
        expect(screen.getByLabelText("Contenu")).toHaveValue(input.body);
        expect(screen.getByLabelText("Rubrique")).toHaveValue(
            input.category,
        );

        expect(
            screen.getByRole("button", {
                name: "Enregistrer le brouillon",
            }),
        ).toBeEnabled();

        expect(
            screen.queryByRole("heading", { name: "Mes articles" }),
        ).not.toBeInTheDocument();

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(false);
    });
});