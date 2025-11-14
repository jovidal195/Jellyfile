import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';  
import './Login.css';

export default function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [show, setShow] = useState(false);

    const login = async () => {
        console.log('login test');
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
