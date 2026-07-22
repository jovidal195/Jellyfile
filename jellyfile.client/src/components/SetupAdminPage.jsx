import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faKey } from '@fortawesome/free-solid-svg-icons';
import "./Interface.css"
import { useToast } from "./ToastProvider";

function SetupAdminPage({ onSetupComplete }) {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const toast = useToast();

    async function createAdmin() {
        const response = await fetch("/api/system/create-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            toast("error", error.message);
            return;
        }

        await navigator.clipboard.writeText(password);

        toast("success", "Compte créé. Votre mot de passe a été copié.");

        onSetupComplete();
    }

    const generateSecurePassword = (length = 20) => {
        const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lower = "abcdefghijkmnopqrstuvwxyz";
        const digits = "23456789";
        const special = "!@#$%^&*";

        const all = upper + lower + digits + special;

        const randomChar = chars => {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return chars[array[0] % chars.length];
        };

        let password = "";

        // Garantit les critères
        password += randomChar(upper);
        password += randomChar(lower);
        password += randomChar(digits);
        password += randomChar(special);

        // Complète le reste
        for (let i = password.length; i < length; i++) {
            password += randomChar(all);
        }

        // Mélange pour éviter que les 4 premiers caractères révèlent la structure
        return password
            .split("")
            .sort(() => Math.random() - 0.5)
            .join("");
    };

    useEffect(() => {
        setPassword(generateSecurePassword());
    }, []);

    return (
        <div className="login-container">
            <label>
                Mot de passe administrateur
            </label>

            <div className="password-field">
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <div className="password-actions">
                    <span
                        className="toggle-key"
                        onClick={() => setPassword(generateSecurePassword())}
                        title="Générer un mot de passe"
                    >
                        <FontAwesomeIcon icon={faKey} />
                    </span>

                    <span
                        className="toggle-eyes"
                        onClick={() => setShowPassword(!showPassword)}
                        title="Afficher ou masquer"
                    >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
            >
                Continuer
            </button>


            {showConfirmModal && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal">
                        <h3>Dernière confirmation</h3>

                        <p>
                            Voulez-vous créer le compte administrateur avec ce mot de passe ?
                        </p>

                        <p className="warning">
                            Ce mot de passe sera nécessaire pour vous connecter.
                            Conservez-le dans un endroit sécurisé.
                        </p>

                        <div className="admin-modal-actions">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Annuler
                            </button>

                            <button
                                onClick={createAdmin}
                            >
                                Créer le compte
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SetupAdminPage;