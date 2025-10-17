import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Interface from './components/Interface';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Vérifie la session au montage
    useEffect(() => {
        fetch('http://localhost:5291/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not logged in');
            })
            .then(data => setUser(data.username))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Chargement...</div>;

    // Ici on passe setUser à LoginPage
    return user ? (
        <Interface user={user} />
    ) : (
        <LoginPage onLoginSuccess={setUser} />
    );
}

export default App;