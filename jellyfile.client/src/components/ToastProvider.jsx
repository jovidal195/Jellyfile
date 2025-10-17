import { createContext, useContext, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import "./Toast.css";

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type = "info", message = null, duration = 3000) => {
        const id = Date.now();

        // Si pas de message fourni, texte générique
        const defaultMessages = {
            success: "Succès !",
            error: "Erreur !",
            warning: "Attention !",
            info: "Info"
        };

        setToasts(prev => [...prev, { id, type, message: message || defaultMessages[type] }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="toast-container-bottom">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <div className="toast-line" />
                        <div className="toast-content">
                            <FontAwesomeIcon icon={
                                t.type === "success" ? faCheckCircle :
                                    t.type === "error" ? faTimesCircle :
                                        t.type === "warning" ? faExclamationTriangle :
                                            faInfoCircle
                            } />
                            <span>{t.message}</span>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// Hook pour utiliser le toast partout
export const useToast = () => useContext(ToastContext);
