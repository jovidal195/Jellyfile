import UserActions from './UserActions';
export default function UserModal({ user, onClose, return2main, setUsers, toggleTheme, theme }) {
    return (
        <div className="modal-backdrop-navigation">
            <div className="modal-content-navigation">
                <h3>{user.username}</h3>
                <UserActions user={user} onClose={onClose} return2main={return2main} setUsers={setUsers} toggleTheme={toggleTheme} theme={theme} />
                <button className="close-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );
}
