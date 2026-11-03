import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
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
    const id = overrides.id ?? 35;

    return {
        "@id": `/api/articles/${id}`,
        id,
        title: "Une bibliothèque ouvre ses portes",
        slug: `une-bibliotheque-ouvre-ses-portes-${id}`,
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
    submitResponse?: () => Response | Promise<Response>,
    resumeResponse?: () => Response | Promise<Response>,
    deleteResponse?: () => Response | Promise<Response>,
) {
    const articleUrl = `/api/articles/${article.id}`;

    const fetchMock = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url === articleUrl && method === "GET") {
                return jsonResponse(article);
            }

            if (url === "/api/categories?page=1" && method === "GET") {
                return jsonResponse({
                    member: [category],
                });
            }

            if (
                url === articleUrl
                && method === "PATCH"
                && patchResponse
            ) {
                return patchResponse();
            }

            if (
                url === `${articleUrl}/submit`
                && method === "POST"
                && submitResponse
            ) {
                return submitResponse();
            }

            if (
                url === `${articleUrl}/resume`
                && method === "POST"
                && resumeResponse
            ) {
                return resumeResponse();
            }

            if (
                url === articleUrl
                && method === "DELETE"
                && deleteResponse
            ) {
                return deleteResponse();
            }

            throw new Error(`Requête inattendue : ${method} ${url}`);
        },
    );

    vi.stubGlobal("fetch", fetchMock);

    return fetchMock;
}

function renderPage(articleId: number = 35) {
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
        member: [makeArticle({ id: articleId })],
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
                    initialEntries={[
                        `/journalist/articles/${articleId}`,
                    ]}
                >
                    <Routes>
                        <Route
                            path="/journalist/articles/:id"
                            element={<JournalistArticleDetailPage />}
                        />
                        <Route
                            path="/journalist"
                            element={<h1>Liste personnelle des articles</h1>}
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

        renderPage(article.id);

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

        expect(
            within(content).getByText(article.body),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Modifier" }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Soumettre" }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/articles/${article.id}`,
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
        renderPage(article.id);

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

        expect(
            screen.queryByRole("button", { name: "Soumettre" }),
        ).not.toBeInTheDocument();
    });

    it.each(["submitted", "published"] as const)(
        "ne propose pas de modification pour le statut %s",
        async (status) => {
            const article = makeArticle({ status });

            mockApi(article);
            renderPage(article.id);

            await screen.findByRole("heading", {
                level: 1,
                name: article.title,
            });

            expect(
                screen.queryByRole("button", { name: "Modifier" }),
            ).not.toBeInTheDocument();

            expect(
                screen.queryByRole("button", { name: "Soumettre" }),
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

        expect(
            screen.queryByRole("button", { name: "Soumettre" }),
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

        expect(
            screen.queryByRole("button", { name: "Soumettre" }),
        ).not.toBeInTheDocument();

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
            `/api/articles/${article.id}`,
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

        const content = screen.getByRole("region", {
            name: "Contenu de l’article",
        });

        expect(
            within(content).getByText(updatedArticle.body),
        ).toBeInTheDocument();

        expect(screen.queryByLabelText("Titre")).not.toBeInTheDocument();

        expect(
            queryClient.getQueryData(["journalist-article", 7, String(article.id)]),
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

        const queryClient = renderPage(article.id);

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
            queryClient.getQueryData(["journalist-article", 7, String(article.id)]),
        ).toEqual(article);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(false);
    });

    it("abandonne les modifications lors de l'annulation", async () => {
        const article = makeArticle();
        const fetchMock = mockApi(article);

        renderPage(article.id);

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

describe("Soumission d'un brouillon", () => {
    it("soumet le brouillon et actualise le détail et les caches", async () => {
        const article = makeArticle();
        const submittedArticle = makeArticle({
            status: "submitted",
        });

        const fetchMock = mockApi(
            article,
            undefined,
            () => jsonResponse(submittedArticle),
        );

        const queryClient = renderPage();

        fireEvent.click(
            await screen.findByRole("button", { name: "Soumettre" }),
        );

        expect(
            await screen.findByText(
                /article a été soumis au rédacteur en chef/,
            ),
        ).toBeInTheDocument();

        expect(screen.getByText("Soumis")).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Modifier" }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Soumettre" }),
        ).not.toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/articles/${article.id}/submit`,
            {
                method: "POST",
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
            },
        );

        expect(
            queryClient.getQueryData(["journalist-article", 7, String(article.id)]),
        ).toEqual(submittedArticle);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(true);
    });

    it("affiche l'erreur et permet de réessayer après un échec", async () => {
        const article = makeArticle();
        const submittedArticle = makeArticle({
            status: "submitted",
        });

        const submitResponse = vi.fn()
            .mockImplementationOnce(() =>
                jsonResponse({
                    detail: "La soumission est temporairement indisponible.",
                }, 503),
            )
            .mockImplementation(() =>
                jsonResponse(submittedArticle),
            );

        mockApi(article, undefined, submitResponse);

        const queryClient = renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", { name: "Soumettre" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "La soumission est temporairement indisponible.",
        );

        expect(screen.getByText("Brouillon")).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Modifier" }),
        ).toBeEnabled();

        expect(
            screen.getByRole("button", { name: "Soumettre" }),
        ).toBeEnabled();

        expect(
            queryClient.getQueryData(["journalist-article", 7, String(article.id)]),
        ).toEqual(article);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(false);

        fireEvent.click(
            screen.getByRole("button", { name: "Soumettre" }),
        );

        expect(
            await screen.findByText(
                /article a été soumis au rédacteur en chef/,
            ),
        ).toBeInTheDocument();

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByText("Soumis")).toBeInTheDocument();
        expect(submitResponse).toHaveBeenCalledTimes(2);
    });

    it("désactive les actions pendant la soumission et évite un second envoi", async () => {
        const article = makeArticle();
        const submittedArticle = makeArticle({
            status: "submitted",
        });

        let resolveSubmission!: (response: Response) => void;

        const pendingResponse = new Promise<Response>((resolve) => {
            resolveSubmission = resolve;
        });

        const submitResponse = vi.fn(() => pendingResponse);

        mockApi(article, undefined, submitResponse);
        renderPage();

        fireEvent.click(
            await screen.findByRole("button", { name: "Soumettre" }),
        );

        const pendingButton = await screen.findByRole("button", {
            name: "Soumission...",
        });

        expect(pendingButton).toBeDisabled();

        expect(
            screen.getByRole("button", { name: "Modifier" }),
        ).toBeDisabled();

        fireEvent.click(pendingButton);

        expect(submitResponse).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveSubmission(jsonResponse(submittedArticle));
            await pendingResponse;
        });

        expect(
            await screen.findByText(
                /article a été soumis au rédacteur en chef/,
            ),
        ).toBeInTheDocument();

        expect(submitResponse).toHaveBeenCalledTimes(1);
    });
});


describe("Reprise d'un article refusé", () => {
    it("reprend l'article et actualise le détail et les caches", async () => {
        const article = makeArticle({
            status: "rejected",
            rejectionReason: "Veuillez compléter les sources.",
        });

        const resumedArticle = makeArticle({
            status: "draft",
            rejectionReason: article.rejectionReason,
        });

        const fetchMock = mockApi(
            article,
            undefined,
            undefined,
            () => jsonResponse(resumedArticle),
        );

        const queryClient = renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Reprendre le brouillon",
            }),
        );

        expect(
            await screen.findByText(
                "L'article a été repris en brouillon.",
            ),
        ).toBeInTheDocument();

        expect(screen.getByText("Brouillon")).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Modifier" }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Soumettre" }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/articles/${article.id}/resume`,
            {
                method: "POST",
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
            },
        );

        expect(
            queryClient.getQueryData([
                "journalist-article",
                7,
                String(article.id),
            ]),
        ).toEqual(resumedArticle);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(true);
    });

    it("affiche l'erreur et permet de réessayer", async () => {
        const article = makeArticle({
            status: "rejected",
            rejectionReason: "Article à corriger.",
        });

        const resumedArticle = makeArticle({
            status: "draft",
            rejectionReason: article.rejectionReason,
        });

        const resumeResponse = vi.fn()
            .mockImplementationOnce(() =>
                jsonResponse({
                    detail: "La reprise est temporairement indisponible.",
                }, 503),
            )
            .mockImplementation(() =>
                jsonResponse(resumedArticle),
            );

        mockApi(article, undefined, undefined, resumeResponse);

        const queryClient = renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Reprendre le brouillon",
            }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "La reprise est temporairement indisponible.",
        );

        expect(screen.getByText("Refusé")).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "Reprendre le brouillon",
            }),
        ).toBeEnabled();

        expect(
            queryClient.getQueryData([
                "journalist-article",
                7,
                String(article.id),
            ]),
        ).toEqual(article);

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(false);

        fireEvent.click(
            screen.getByRole("button", {
                name: "Reprendre le brouillon",
            }),
        );

        expect(
            await screen.findByText(
                "L'article a été repris en brouillon.",
            ),
        ).toBeInTheDocument();

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByText("Brouillon")).toBeInTheDocument();
        expect(resumeResponse).toHaveBeenCalledTimes(2);
    });

    it("désactive le bouton pendant la reprise et évite un second envoi", async () => {
        const article = makeArticle({
            status: "rejected",
            rejectionReason: "Article à compléter.",
        });

        const resumedArticle = makeArticle({
            status: "draft",
            rejectionReason: null,
        });

        let resolveResumption!: (response: Response) => void;

        const pendingResponse = new Promise<Response>((resolve) => {
            resolveResumption = resolve;
        });

        const resumeResponse = vi.fn(() => pendingResponse);

        mockApi(article, undefined, undefined, resumeResponse);
        renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Reprendre le brouillon",
            }),
        );

        const pendingButton = await screen.findByRole("button", {
            name: "Reprise...",
        });

        expect(pendingButton).toBeDisabled();

        fireEvent.click(pendingButton);

        expect(resumeResponse).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveResumption(jsonResponse(resumedArticle));
            await pendingResponse;
        });

        expect(
            await screen.findByText(
                "L'article a été repris en brouillon.",
            ),
        ).toBeInTheDocument();

        expect(resumeResponse).toHaveBeenCalledTimes(1);
    });
});

describe("Identifiants des articles", () => {
    it.each([12, 35, 108])(
        "charge l'article demandé avec l'identifiant %i",
        async (id) => {
            const article = makeArticle({ id });
            const fetchMock = mockApi(article);

            renderPage(id);

            expect(
                await screen.findByRole("heading", {
                    level: 1,
                    name: article.title,
                }),
            ).toBeInTheDocument();

            expect(fetchMock).toHaveBeenCalledWith(
                `/api/articles/${id}`,
                expect.objectContaining({
                    headers: {
                        Accept: "application/ld+json",
                        Authorization: "Bearer token-de-test",
                    },
                }),
            );
        },
    );
});

describe("Suppression d'un brouillon", () => {
    it("propose la suppression uniquement à l'auteur d'un brouillon", async () => {
        const article = makeArticle();

        mockApi(article);
        renderPage(article.id);

        expect(
            await screen.findByRole("button", {
                name: "Supprimer le brouillon",
            }),
        ).toBeInTheDocument();
    });

    it.each(["submitted", "published", "rejected"] as const)(
        "ne propose pas la suppression pour le statut %s",
        async (status) => {
            const article = makeArticle({ status });

            mockApi(article);
            renderPage(article.id);

            await screen.findByRole("heading", {
                level: 1,
                name: article.title,
            });

            expect(
                screen.queryByRole("button", {
                    name: "Supprimer le brouillon",
                }),
            ).not.toBeInTheDocument();
        },
    );

    it("ne propose pas la suppression du brouillon d'un autre auteur", async () => {
        const article = makeArticle({
            author: {
                id: 8,
                displayName: "Autre journaliste",
            },
        });

        mockApi(article);
        renderPage(article.id);

        await screen.findByRole("heading", {
            level: 1,
            name: article.title,
        });

        expect(
            screen.queryByRole("button", {
                name: "Supprimer le brouillon",
            }),
        ).not.toBeInTheDocument();
    });

    it("demande confirmation et permet d'annuler sans requête DELETE", async () => {
        const article = makeArticle();
        const fetchMock = mockApi(article);

        renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Supprimer le brouillon",
            }),
        );

        expect(
            screen.getByText(/Voulez-vous vraiment supprimer ce brouillon/),
        ).toBeInTheDocument();

        expect(
            fetchMock.mock.calls.some(
                ([, options]) => options?.method === "DELETE",
            ),
        ).toBe(false);

        fireEvent.click(
            screen.getByRole("button", { name: "Annuler" }),
        );

        expect(
            screen.queryByRole("button", {
                name: "Confirmer la suppression",
            }),
        ).not.toBeInTheDocument();

        expect(
            fetchMock.mock.calls.some(
                ([, options]) => options?.method === "DELETE",
            ),
        ).toBe(false);
    });

    it("supprime le brouillon et revient à la liste personnelle", async () => {
        const article = makeArticle();

        const fetchMock = mockApi(
            article,
            undefined,
            undefined,
            undefined,
            () => new Response(null, { status: 204 }),
        );

        const queryClient = renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Supprimer le brouillon",
            }),
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Confirmer la suppression",
            }),
        );

        expect(
            await screen.findByRole("heading", {
                name: "Liste personnelle des articles",
            }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/articles/${article.id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: "Bearer token-de-test",
                },
            },
        );

        expect(
            queryClient.getQueryData([
                "journalist-article",
                7,
                String(article.id),
            ]),
        ).toBeUndefined();

        expect(
            queryClient.getQueryState(["own-articles", 7, 1])
                ?.isInvalidated,
        ).toBe(true);
    });

    it("affiche une erreur et permet de réessayer", async () => {
        const article = makeArticle();

        const deleteResponse = vi.fn()
            .mockImplementationOnce(() =>
                jsonResponse({}, 503),
            )
            .mockImplementation(() =>
                new Response(null, { status: 204 }),
            );

        mockApi(
            article,
            undefined,
            undefined,
            undefined,
            deleteResponse,
        );

        renderPage(article.id);

        fireEvent.click(
            await screen.findByRole("button", {
                name: "Supprimer le brouillon",
            }),
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Confirmer la suppression",
            }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Impossible de supprimer l'article",
        );

        expect(
            screen.getByRole("heading", {
                level: 1,
                name: article.title,
            }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Confirmer la suppression",
            }),
        );

        await waitFor(() => {
            expect(deleteResponse).toHaveBeenCalledTimes(2);
        });

        expect(
            await screen.findByRole("heading", {
                name: "Liste personnelle des articles",
            }),
        ).toBeInTheDocument();
    });
});
