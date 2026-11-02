import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login } from "../api/auth";
import type { CurrentUser } from "../api/auth";
import { AuthContext } from "./AuthContext";
import { getTokenExpiration } from "./token";

interface Session {
    token: string;
    user: CurrentUser;
    expiresAt: number;
}

export default function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [session, setSession] = useState<Session | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    async function signIn(email: string, password: string): Promise<void> {
        const token = await login(email.trim(), password);
        const expiresAt = getTokenExpiration(token);
        const user = await getCurrentUser(token);

        if (expiresAt <= Date.now()) {
            throw new Error(
                "Votre session a expiré. Veuillez vous reconnecter.",
            );
        }

        queryClient.clear();
        setSession({ token, user, expiresAt });
    }

    function signOut(): void {
        setSession(null);
        queryClient.clear();
    }

    useEffect(() => {
        if (!session) {
            return;
        }

        let timer: ReturnType<typeof setTimeout>;

        function checkExpiration() {
            if (!session) {
                return;
            }

            clearTimeout(timer);

            const remaining = session.expiresAt - Date.now();

            if (remaining <= 0) {
                setSession(null);
                queryClient.clear();
                navigate("/login", { replace: true });
                return;
            }

            timer = setTimeout(
                checkExpiration,
                Math.min(remaining, 2_147_483_647),
            );
        }

        // Le premier contrôle est différé hors de l'exécution de l'effet.
        timer = setTimeout(checkExpiration, 0);
        window.addEventListener("focus", checkExpiration);
        document.addEventListener("visibilitychange", checkExpiration);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("focus", checkExpiration);
            document.removeEventListener(
                "visibilitychange",
                checkExpiration,
            );
        };
    }, [session, queryClient, navigate]);

    return (
        <AuthContext.Provider
            value={{
                token: session?.token ?? null,
                user: session?.user ?? null,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
