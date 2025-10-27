import UserActions from './UserActions';
export default function UserModal({ user, onClose, return2main, setUsers }) {
    return (
        <div className="modal-backdrop-navigation">
            <div className="modal-content-navigation">
                <h3>{user}</h3>
                <UserActions onClose={onClose} return2main={return2main} setUsers={setUsers} />
                <button className="close-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );
}
