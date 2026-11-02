import { useAuth } from "../auth/AuthContext";

export default function EditorDashboardPage() {
    const { user } = useAuth();

    return (
        <main className="page">
            <h1>Espace rédacteur en chef</h1>
            <p>Bienvenue, {user?.displayName}!</p>
            <p>Les articles à relire seront disponibles ici.</p>
        </main>
    );
}
