import { Link, Route, Routes } from "react-router-dom";
import ArticleListPage from "./pages/ArticleListPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import AuthNavigation from "./auth/AuthNavigation";
import LoginPage from "./pages/LoginPage";
import RequireRole from "./auth/RequireRole";
import JournalistDashboardPage from "./pages/JournalistDashboardPage";
import EditorDashboardPage from "./pages/EditorDashboardPage";
import ArticleCreatePage from "./pages/ArticleCreatePage";
import AuthProvider from "./auth/AuthProvider";
import "./App.css"

export default function App() {
    return (
        <AuthProvider>
            <AuthNavigation />
            <Routes>
                <Route path="/" element={<ArticleListPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/articles/:id" element={<ArticleDetailPage />} />
                <Route element={<RequireRole role="ROLE_JOURNALIST" />}>
                    <Route
                        path="/journalist"
                        element={<JournalistDashboardPage />}
                    />
                    <Route
                        path="/journalist/articles/new"
                        element={<ArticleCreatePage />}
                    />
                </Route>
                <Route element={<RequireRole role="ROLE_EDITOR" />}>
                    <Route
                        path="/editor"
                        element={<EditorDashboardPage />}
                    />
                </Route>
                <Route
                    path="*"
                    element={
                        <main className="page">
                            <h1>Page introuvable</h1>
                            <Link to="/">Retour aux articles</Link>
                        </main>
                    }
                />
            </Routes>
        </AuthProvider>
    )
}
