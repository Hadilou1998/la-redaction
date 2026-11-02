import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
    const { user, signIn } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page">
            <Link to="/">Retour aux articles</Link>
            <h1>Connexion</h1>

            <form
                onSubmit={async (event) => {
                    event.preventDefault();
                    setError(null);
                    setIsSubmitting(true);

                    try {
                        await signIn(email, password);
                        setPassword("");
                        navigate("/", { replace: true });
                    } catch (caughtError) {
                        setError(
                            caughtError instanceof Error
                                ? caughtError.message
                                : "Connexion échouée."
                        );
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            >
                <div>
                    <label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label htmlFor="login-password">Mot de passe</label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {error && <p role="alert">{error}</p>}

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Connexion en cours..." : "Se connecter"}
                </button>
            </form>
        </main>
    )
}
