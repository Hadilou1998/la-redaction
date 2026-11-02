import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import AuthProvider from "./AuthProvider";
import { useAuth } from "./AuthContext";

function SessionPage() {
    const { user, signIn } = useAuth();

    return (
        <>
            <p>{user ? `Connecté : ${user.displayName}` : "Non connecté"}</p>
            <button
                type="button"
                onClick={() => void signIn("journalist1@example.test", "password123")}
            >
                Ouvrir la session
            </button>
        </>
    );
}

it("ferme la session et revient à la connexion à l'expiration du JWT", async () => {
    vi.useFakeTimers();

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });

    try {
        vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));

        const payload = btoa(JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 60,
        }));
        const token = `header.${payload}.signature`;

        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = new URL(String(input), "http://localhost");

                if (url.pathname === "/api/login") {
                    return new Response(JSON.stringify({ token }), {
                        status: 200,
                    });
                }

                if (url.pathname === "/api/me") {
                    return new Response(JSON.stringify({
                        id: 1,
                        email: "journalist1@example.test",
                        displayName: "Journaliste de test",
                        roles: ["ROLE_JOURNALIST"],
                    }), {
                        status: 200,
                    });
                }

                throw new Error(`Requête inattendue : ${url.pathname}`);
            }),
        );

        const view = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={["/session"]}>
                    <AuthProvider>
                        <Routes>
                            <Route path="/session" element={<SessionPage />} />
                            <Route path="/login" element={<h1>Connexion</h1>} />
                        </Routes>
                    </AuthProvider>
                </MemoryRouter>
            </QueryClientProvider>,
        );

        try {
            await act(async () => {
                fireEvent.click(
                    screen.getByRole("button", { name: "Ouvrir la session" }),
                );
            });

            expect(
                screen.getByText("Connecté : Journaliste de test"),
            ).toBeInTheDocument();

            // Ajout d'une donnée privée après la connexion.
            queryClient.setQueryData(["private-articles"], ["Article privé"]);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(59_000);
            });

            expect(
                screen.getByText("Connecté : Journaliste de test"),
            ).toBeInTheDocument();

            await act(async () => {
                await vi.advanceTimersByTimeAsync(1_000);
            });

            expect(
                screen.getByRole("heading", { name: "Connexion" }),
            ).toBeInTheDocument();

            expect(
                screen.queryByText("Connecté : Journaliste de test"),
            ).not.toBeInTheDocument();

            expect(
                queryClient.getQueryData(["private-articles"]),
            ).toBeUndefined();
        } finally {
            view.unmount();
        }
    } finally {
        queryClient.clear();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    }
});