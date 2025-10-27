import UserActions from './UserActions';
export default function UserMenu({ user, onClose, return2main, setUsers }) {
    return (
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
            <div>{user}</div>
            <hr />
            <UserActions onClose={onClose} return2main={return2main} setUsers={setUsers} />
        </div>
    );
}
