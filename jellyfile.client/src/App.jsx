import { useState, useEffect } from 'react';
import { ToastProvider } from "./Components/ToastProvider";
import LoginPage from './components/LoginPage';
import Interface from './components/Interface';
import InvitePage from './components/InvitePage'; // ton composant déjà créé
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:5291/api/auth/me', { credentials: 'include' })
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

    if (loading) return <div>Chargement...</div>;

    return (
        <ToastProvider>
            <Router>
                <Routes>
                    {/* Route principale selon l’état de login */}
                    {user ? (
                        <Route path="/*" element={<Interface />} />
                    ) : (
                        <Route path="/*" element={<LoginPage onLoginSuccess={setUser} />} />
                    )}
                    {/* Route pour l’invitation */}
                    <Route path="/invite" element={<InvitePage />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
}

export default App;
