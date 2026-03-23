import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';  
import './Login.css';
import ToggleSwitch from "./ToggleSwitch";

export default function LoginPage({ onLoginSuccess, toggleTheme, theme }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [show, setShow] = useState(false);

    const login = async () => {
        const res = await fetch('/api/auth/login', {
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
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", margin: "20px", justifyContent: "center" }}><FontAwesomeIcon icon={faSun} /><ToggleSwitch onChange={toggleTheme} checked={theme === "dark"} /><FontAwesomeIcon icon={faMoon} /></div>
            {error && <p className="login-error">{error}</p>}
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input placeholder="Password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} />
            <span className="toggle-eye" onClick={() => setShow(!show)}>
                {show ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
            </span>
            <button type="submit">Connexion</button>
        </form>
    );
}
