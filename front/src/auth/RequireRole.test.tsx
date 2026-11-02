import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "./AuthContext";
import RequireRole from "./RequireRole";
import type { CurrentUser } from "../api/auth";

function renderProtectedPage(user: CurrentUser | null) {
    return render(
        <AuthContext.Provider
            value={{
                user,
                token: user ? "token-de-test" : null,
                signIn: vi.fn().mockResolvedValue(undefined),
                signOut: vi.fn(),
            }}
        >
            <MemoryRouter initialEntries={["/editor"]}>
                <Routes>
                    <Route
                        path="/login"
                        element={<h1>Connexion</h1>}
                    />

                    <Route element={<RequireRole role="ROLE_EDITOR" />}>
                        <Route
                            path="/editor"
                            element={<h1>Contenu réservé au rédacteur</h1>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    );
}

describe("Protection des routes par rôle", () => {
    it("redirige un visiteur vers la connexion", async () => {
        renderProtectedPage(null);

        expect(
            await screen.findByRole("heading", { name: "Connexion" }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("heading", {
                name: "Contenu réservé au rédacteur",
            }),
        ).not.toBeInTheDocument();
    });

    it("refuse l'accès à un journaliste", () => {
        renderProtectedPage({
            id: 1,
            email: "journalist1@example.test",
            displayName: "Journaliste de test",
            roles: ["ROLE_JOURNALIST"],
        });

        expect(
            screen.getByRole("heading", { name: "Accès refusé" }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("heading", {
                name: "Contenu réservé au rédacteur",
            }),
        ).not.toBeInTheDocument();
    });

    it("autorise le rédacteur en chef", () => {
        renderProtectedPage({
            id: 2,
            email: "editor@example.test",
            displayName: "Rédacteur de test",
            roles: ["ROLE_EDITOR"],
        });

        expect(
            screen.getByRole("heading", {
                name: "Contenu réservé au rédacteur",
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("heading", { name: "Accès refusé" }),
        ).not.toBeInTheDocument();
    });
});
