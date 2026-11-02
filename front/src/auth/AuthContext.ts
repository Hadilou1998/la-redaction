import { createContext, useContext } from "react";
import type { CurrentUser } from "../api/auth";

interface AuthContextValue {
    token: string | null;
    user: CurrentUser | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === null) {
        throw new Error("useAuth doit être utilisé dans AuthProvider.");
    }

    return context;
}
