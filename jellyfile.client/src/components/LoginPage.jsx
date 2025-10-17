import { useState } from 'react';
import './Login.css';

export default function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const login = async () => {
        const res = await fetch('http://localhost:5291/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (res.ok) {
            onLoginSuccess(username);   // on indique à App.jsx que login réussi
            setError('');
        } else {
            setError('Login failed');
        }
    };

    return (
        <form className="login-container" onSubmit={e => { e.preventDefault(); login(); }}>
            <h2>Connexion</h2>
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit">Login</button>
            {error && <p className="login-error">{error}</p>}
        </form>
    );
}
