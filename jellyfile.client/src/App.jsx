import { useState } from 'react';
import LoginPage from './components/LoginPage';
import Interface from './components/Interface';
import './App.css';

function App() {
    const [user, setUser] = useState(null);

    // Ici on passe setUser à LoginPage
    return user ? (
        <Interface user={user} />
    ) : (
        <LoginPage onLoginSuccess={setUser} />
    );
}

export default App;