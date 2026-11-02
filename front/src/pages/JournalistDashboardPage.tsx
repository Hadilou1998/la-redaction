import { useAuth } from "../auth/AuthContext";

export default function JournalistDashboardPage() {
    const { user } = useAuth();

    return (
        <main className="page">
            <h1>Espace journaliste</h1>
            <p>Bienvenue, {user?.displayName}!</p>
            <p>La gestion de vos articles sera disponible ici.</p>
        </main>
    );
}
