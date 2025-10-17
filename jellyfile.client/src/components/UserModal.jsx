import UserActions from './UserActions';
export default function UserModal({ user, onClose }) {
    return (
        <div className="modal-backdrop-navigation">
            <div className="modal-content-navigation">
                <h3>{user}</h3>
                <UserActions onClose={onClose} />
                <button className="close-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );
}
