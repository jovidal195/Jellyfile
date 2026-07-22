import { useState, useEffect } from 'react';
import { ToastProvider } from "./components/ToastProvider";
import LoginPage from './components/LoginPage';
import Interface from './components/Interface';
import InvitePage from './components/InvitePage';
import PinGatePage from './components/PinGatePage';
import ExternalPreviewPage from './components/ExternalPreviewPage.jsx';
import SetupAdminPage from './components/SetupAdminPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './theme.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState("light");
    const [adminExists, setAdminExists] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        const appliedTheme = stored === "dark" || stored === "light" ? stored : (systemPrefersDark ? "dark" : "light");
        setTheme(appliedTheme);
        document.documentElement.setAttribute("data-theme", appliedTheme);

        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not logged in');
            })
            .then(data => {
                setUser(data);
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function checkAdminExists() {
            const maxAttempts = 5;
            const delay = 250;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    console.log(`admin-exists attempt ${attempt}/${maxAttempts}`);

                    const response = await fetch('/api/system/admin-exists');

                    if (response.ok) {
                        const data = await response.json();

                        console.log("admin-exists success:", data);

                        if (!cancelled) {
                            setAdminExists(data.adminExists);
                        }

                        return;
                    }

                    console.warn(
                        `admin-exists failed with status ${response.status}`
                    );

                } catch (err) {
                    console.warn(
                        `admin-exists error attempt ${attempt}`,
                        err
                    );
                }

                if (attempt < maxAttempts) {
                    await new Promise(resolve =>
                        setTimeout(resolve, delay)
                    );
                }
            }

            if (!cancelled) {
                // seulement ici on considère qu'il faut setup
                setAdminExists(false);
            }
        }

        checkAdminExists();

        return () => {
            cancelled = true;
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    if (loading) return <div>Chargement...</div>;

    if (!adminExists)
        return (<ToastProvider>
                <SetupAdminPage
                    onSetupComplete={() => setAdminExists(true)}
                />
            </ToastProvider>
        )

    return (
        <ToastProvider>
            <Router>
                <Routes>
                    {/* Route principale selon l’état de login */}
                    {user ? (
                        <Route path="/*" element={<Interface toggleTheme={toggleTheme} theme={theme} />} />
                    ) : (
                        <Route path="/*" element={<LoginPage toggleTheme={toggleTheme} theme={theme} onLoginSuccess={setUser} />} />
                    )}
                    {/* Route pour l’invitation */}
                    <Route path="/invite" element={<InvitePage />} />
                    <Route path="/pin/:uuid/:accesstoken/:fileName" element={<PinGatePage />} />
                    <Route path="/external-preview/:uuid/:accesstoken/:fileName" element={<ExternalPreviewPage />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
}

export default App;
