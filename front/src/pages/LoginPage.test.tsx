import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

function renderLogin() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/login"]}>
                <App />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json"},
    });
}

function fillLogin() {
    fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "journalist1@example.test" },
    });

    fireEvent.change(screen.getByLabelText("Mot de passe"), {
        target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
}

describe("Connexion", () => {
    it("affiche une erreur lorsque les identifiants sont refusés", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockImplementation(async () => {
                return jsonResponse({ message: "Invalid credentials." }, 401);
            }),
        );

        renderLogin();
        fillLogin();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Email ou mot de passe incorrect."
        );

        expect(
            screen.getByRole("heading", { name: "Connexion" })
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Se déconnecter" })
        ).not.toBeInTheDocument();
    });

    it("connecte l'utilisateur puis permet de se déconnecter", async () => {
        const payload = btoa(JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 3600,
        }));

        const testToken = `header.${payload}.signature`;

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input), "http://localhost");

            if (url.pathname === "/api/login") {
                return jsonResponse({ token: testToken });
            }

            if (url.pathname === "/api/me") {
                return jsonResponse({
                    id: 1,
                    email: "journalist1@example.test",
                    displayName: "Journaliste de test",
                    roles: ["ROLE_JOURNALIST"],
                });
            }

            if (url.pathname === "/api/categories") {
                return jsonResponse({ member: [] });
            }

            if (url.pathname === "/api/articles") {
                return jsonResponse({ totalItems: 0, member: [] });
            }

            throw new Error(`Requête inattendue : ${url.pathname}`);
        });

        vi.stubGlobal("fetch", fetchMock);

        renderLogin();
        fillLogin();

        expect(
            await screen.findByText("Connecté : Journaliste de test"),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/login",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    email: "journalist1@example.test",
                    password: "password123",
                }),
            }),
        );

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/me",
            expect.objectContaining({
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${testToken}`,
                },
            }),
        );

        await screen.findByRole("heading", {
            name: "Les derniers articles",
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Se déconnecter" }),
        );

        expect(
            await screen.findByRole("heading", { name: "Connexion" }),
        ).toBeInTheDocument();

        expect(
            screen.queryByText("Connecté : Journaliste de test"),
        ).not.toBeInTheDocument();

        expect(screen.getByLabelText("Mot de passe")).toHaveValue("");
    });
});
