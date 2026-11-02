import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AuthNavigation() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="auth-navigation" aria-label="Compte Utilisateur">
            {user ? (
                <>
                    <span>Connecté : {user.displayName}</span>
                    <Link to="/">Articles publiés</Link>

                    {user.roles.includes("ROLE_JOURNALIST") && (
                        <Link to="/journalist">Espace journaliste</Link>
                    )}

                    {user.roles.includes("ROLE_EDITOR") && (
                        <Link to="/editor">Espace rédacteur en chef</Link>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            signOut();
                            navigate("/login", { replace: true });
                        }}
                    >
                        Se déconnecter
                    </button>
                </>
            ) : (
                <Link to="/login">Se connecter</Link>
            )}
        </nav>
    )
}
