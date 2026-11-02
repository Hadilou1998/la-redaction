import { Link, Route, Routes } from "react-router-dom";
import ArticleListPage from "./pages/ArticleListPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import "./App.css"

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<ArticleListPage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
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
    )
}
