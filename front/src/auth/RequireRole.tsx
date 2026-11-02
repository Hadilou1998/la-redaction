import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireRole({ role }: { role: string }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.roles.includes(role)) {
        return (
            <main className="page">
                <h1>Accès refusé</h1>
                <p>Votre compte ne permet pas d'accéder à cette page.</p>
                <Link to="/">Retour aux articles</Link>
            </main>
        )
    }

    return <Outlet />;
}
