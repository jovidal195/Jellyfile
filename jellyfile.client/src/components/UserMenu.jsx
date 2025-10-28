import UserActions from './UserActions';
export default function UserMenu({ user, onClose, return2main, setUsers }) {
    return (
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
            <div>{user.username}</div>
            <hr />
            <UserActions user={user} onClose={onClose} return2main={return2main} setUsers={setUsers} />
        </div>
    );
}
