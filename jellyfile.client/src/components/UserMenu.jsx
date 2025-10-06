export default function UserMenu({ user, onClose }) {
    return (
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
            <div>{user}</div>
            <hr />
            <button onClick={() => alert("Profil")}>Profil</button>
            <button onClick={() => alert("Déconnexion")}>Déconnexion</button>
        </div>
    );
}
