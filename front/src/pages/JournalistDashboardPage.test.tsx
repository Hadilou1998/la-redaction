import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import type { ArticleSummary } from "../api/articles";
import JournalistDashboardPage from "./JournalistDashboardPage";

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
                <JournalistDashboardPage />
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
    status: ArticleSummary["status"],
): ArticleSummary {
    return {
        "@id": `/api/articles/${id}`,
        id,
        title,
        slug: `article-${id}`,
        chapo: "Une introduction de démonstration.",
        status,
        publishedAt: status === "published"
            ? "2026-10-31T12:00:00+00:00"
            : null,
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
    };
}

describe("Liste des articles du journaliste", () => {
    it("affiche les quatre statuts et transmet l'auteur et le jeton", async () => {
        const fetchMock = vi.fn(async () =>
            jsonResponse({
                totalItems: 4,
                member: [
                    article(1, "Mon article en brouillon", "draft"),
                    article(2, "Mon article soumis", "submitted"),
                    article(3, "Mon article publié", "published"),
                    article(4, "Mon article refusé", "rejected"),
                ],
            }),
        );

        vi.stubGlobal("fetch", fetchMock);

        renderDashboard();

        const list = await screen.findByRole("region", {
            name: "Mes articles",
        });

        expect(within(list).getAllByRole("article")).toHaveLength(4);

        for (const label of ["Brouillon", "Soumis", "Publié", "Refusé"]) {
            expect(within(list).getByText(label)).toBeInTheDocument();
        }

        expect(screen.getByText("4 articles")).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles?author=7&page=1",
            expect.objectContaining({
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
            }),
        );
    });

    it("permet de passer à la page suivante puis de revenir", async () => {
        const firstPage = {
            totalItems: 2,
            member: [article(1, "Premier article personnel", "draft")],
            view: {
                next: "/api/articles?author=7&page=2",
            },
        };

        const secondPage = {
            totalItems: 2,
            member: [article(2, "Deuxième article personnel", "submitted")],
            view: {
                previous: "/api/articles?author=7&page=1",
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
                name: "Premier article personnel",
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Précédent" }),
        ).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

        expect(
            await screen.findByRole("heading", {
                name: "Deuxième article personnel",
            }),
        ).toBeInTheDocument();

        expect(screen.getByText("Page 2")).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Suivant" }),
        ).toBeDisabled();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/articles?author=7&page=2",
            expect.objectContaining({
                headers: {
                    Accept: "application/ld+json",
                    Authorization: "Bearer token-de-test",
                },
            }),
        );

        fireEvent.click(screen.getByRole("button", { name: "Précédent" }));

        expect(
            await screen.findByRole("heading", {
                name: "Premier article personnel",
            }),
        ).toBeInTheDocument();

        expect(screen.getByText("Page 1")).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Précédent" }),
        ).toBeDisabled();

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "Suivant" }),
            ).toBeEnabled();
        });
    });

    it("affiche un message lorsque le journaliste n'a aucun article", async () => {
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
            await screen.findByText("Aucun article disponible sur cette page."),
        ).toBeInTheDocument();

        expect(screen.queryByRole("article")).not.toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Précédent" }),
        ).toBeDisabled();

        expect(
            screen.getByRole("button", { name: "Suivant" }),
        ).toBeDisabled();
    });

    it("permet de réessayer après une erreur de l'API", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({}, 500))
            .mockImplementation(async () =>
                jsonResponse({
                    totalItems: 1,
                    member: [
                        article(1, "Article chargé après nouvelle tentative", "draft"),
                    ],
                }),
            );

        vi.stubGlobal("fetch", fetchMock);

        renderDashboard();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Impossible de charger vos articles (HTTP 500).",
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Essayer à nouveau" }),
        );

        expect(
            await screen.findByRole("heading", {
                name: "Article chargé après nouvelle tentative",
            }),
        ).toBeInTheDocument();

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});