import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import UserModal from "./UserModal";
import MenuProfil from './menuProfil';
import MenuUsers from './menuUsers';
import FileZone from './FileZone';
import FileViewer from './FileViewer';
import UserTree from './userTree';
import './Interface.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { displayFilePage } from "../utils/displayFilePage.js";


export default function Interface({ toggleTheme, theme }) {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState(null);
    const [tree, setTree] = useState([]);
    const [avatarLink, setavatarLink] = useState("");
    const [file, setFile] = useState({});


    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not logged in');
            })
            .then(data => {
                setUser(data);
                setavatarLink(`/api/files/avatar/${data.username}?t=${Date.now()}`);
                reloadTree();
            })
            .catch((err) => {
                console.error(err);
                setUser(null)
            })

        fetch("/api/files/tree", {
            credentials: "include"
        })
            .then(res => res.json())
            .then(data => setTree(data))
            .catch(err => console.error(err));

    }, []);

    useEffect(() => {
        if (!location.state?.fileToDisplay) return;

        const id = setTimeout(() => {
            displayFilePage(location.state.fileToDisplay, setFile);
            window.history.replaceState({}, "");
        }, 0);

        return () => clearTimeout(id);
    }, [location.state]);

    const toggleMenu = (e) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const return2main = () => {
        closeMenu()
        const rightBox = document.querySelector(".right-box");
        const leftBox = document.querySelector(".left-box");

        rightBox.querySelectorAll(":scope > div").forEach(div => {
            div.style.display = "none";
        });
        leftBox.style.display = "initial";
        const fileZone = document.querySelector(".home");
        fileZone.style.display = "grid";

    }

    const reloadTree = async () => {
        if (!user) return;
        try {
            const res = await fetch("/api/files/tree", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setTree(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <div className="mainapp-container">
            <header className="top-bar">
                <span onClick={return2main} style={{ "cursor": "pointer", "padding" : "17px"}}>Jellyfile</span>  {/* gauche */}

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        onKeyDown={(e) => { if (e.key === 'Enter') console.log('Recherche:', e.target.value) }}
                    />
                    <button onClick={() => console.log('Recherche:', document.querySelector('.search-container input').value)}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{'color': 'var(--interface-text)' }} />
                    </button>
                </div>
                <span className="user-btn" onClick={toggleMenu}>
                    { avatarLink === "" ? (
                        <FontAwesomeIcon icon={faCircleUser} style={{ fontSize: '26px' }} />
                        
                    ) : (
                            <img
                                src={avatarLink}
                                alt="Avatar"
                                className="avatar-menu"
                                onError={() => setavatarLink("")}
                            />
                    )}
                </span>
                {menuOpen &&
                    (isMobile ? (
                    <UserModal user={user} onClose={closeMenu} return2main={return2main} setUsers={setUsers} toggleTheme={toggleTheme} theme={theme} />
                    ) : (
                        <UserMenu user={user} onClose={closeMenu} return2main={return2main} setUsers={setUsers} toggleTheme={toggleTheme} theme={theme} />
                    ))}
            </header>
            <div className="content">
                <UserTree user={user} tree={tree} setFile={setFile} />
                <div className="right-box">
                    <FileViewer user={user} reloadTree={reloadTree} file={file} return2main={return2main} setFile={setFile} setavatarLink={setavatarLink} />
                    <FileZone user={user} reloadTree={reloadTree} setFile={setFile} />
                    <MenuProfil user={user} setavatarLink={setavatarLink} avatarLink={avatarLink} reloadTree={reloadTree}/>
                    {user?.role === "Admin" && (
                        <MenuUsers users={users} setUsers={setUsers} />
                    )}
                </div>
            </div>
        </div>
    );
}
