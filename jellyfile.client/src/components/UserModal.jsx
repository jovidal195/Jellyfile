export default function UserModal({ user, onClose }) {
    return (
        <div className="user-modal">
            <div className="modal-content">
                <h3>{user}</h3>
                <button onClick={() => alert("Profil")}>Profil</button>
                <button onClick={() => alert("Déconnexion")}>Déconnexion</button>
                <button className="close-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );
}
