import UserActions from './UserActions';
export default function UserModal({ user, onClose }) {
    return (
        <div className="user-modal">
            <div className="modal-content">
                <h3>{user}</h3>
                <UserActions onClose={onClose} />
                <button className="close-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );
}
