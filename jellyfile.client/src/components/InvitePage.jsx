import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InvitePage() {
    const navigate = useNavigate(); 
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [strength, setStrength] = useState(0); // 0-4
    const [strengthLabel, setStrengthLabel] = useState("Mot de passe faible");
    const [strengthColor, setStrengthColor] = useState("red");

    // Analyse de sécurité
    useEffect(() => {
        let score = 0;

        // Vérifications classiques
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        // Longueur
        if (password.length >= 12) score++; // bonus pour longueur idéale
        else if (password.length >= 8) score += 0.5; // demi-point pour 8-11 caractères

        // Normalisation
        const normalized = Math.min(Math.floor(score), 5);
        setStrength(normalized);

        // Label et couleur
        switch (normalized) {
            case 0:
            case 1:
                setStrengthLabel("Très faible");
                setStrengthColor("red");
                break;
            case 2:
                setStrengthLabel("Faible");
                setStrengthColor("orange");
                break;
            case 3:
                setStrengthLabel("Moyen");
                setStrengthColor("gold");
                break;
            case 4:
                setStrengthLabel("Fort");
                setStrengthColor("green");
                break;
            case 5:
                setStrengthLabel("Très fort");
                setStrengthColor("darkgreen");
                break;
        }
    }, [password]);


    const activate = async () => {
        if (password !== confirmPassword) {
            setMessage("Les mots de passe ne correspondent pas");
            return;
        }

        if (strength <= 2) {
            setMessage("Mot de passe trop faible pour être accepté");
            return;
        }

        try {
            const token = new URLSearchParams(window.location.search).get("token");
            const res = await fetch(`/api/users/activate/${encodeURIComponent(token)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });
            const text = await res.text();
            setMessage(text);

            if (res.ok) {
                setTimeout(() => navigate("/"), 2000); // redirection après succès
            }
        } catch (err) {
            setMessage("Erreur lors de l'activation");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") activate();
    };

    // Calcul largeur barre
    const maxScore = 5;
    const widthPercent = Math.min(strength / maxScore, 1) * 100;

    return (
        <div className="login-container" style={{ maxWidth: 400, margin: "auto" }}>
            <h2>Activer votre compte</h2>
            <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ display: "block", marginBottom: 8, width: "100%" }}
            />
            <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ display: "block", marginBottom: 8, width: "100%" }}
            />
            <div style={{ height: 10, backgroundColor: "#eee", width: "100%", marginBottom: 4 }}>
                <div
                    style={{
                        width: `${widthPercent}%`,
                        height: "100%",
                        backgroundColor: strengthColor,
                        transition: "width 0.3s"
                    }}
                />
            </div>
            <div style={{ marginBottom: 12, fontWeight: "bold", color: strengthColor }}>
                {strengthLabel}
            </div>
            <button onClick={activate} style={{ width: "100%", padding: 8 }}>
                Activer
            </button>
            {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </div>
    );
}
