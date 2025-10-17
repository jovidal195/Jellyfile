import { useState, useEffect } from "react";
import UserMenu from "./UserMenu";
import UserModal from "./UserModal";
import MenuProfil from './menuProfil';
import './Interface.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';


export default function Interface({ user }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const toggleMenu = (e) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const return2main = () => {
        
        const rightBox = document.querySelector(".right-box");
        const leftBox = document.querySelector(".left-box");

        rightBox.querySelectorAll(":scope > div").forEach(div => {
            div.style.display = "none";
        });
        leftBox.style.display = "initial";
        const fileZone = document.querySelector("#fileZone");
        fileZone.style.display = "initial";

    }

    const closeMenu = () => setMenuOpen(false);

    return (
        <div className="mainapp-container">
            <header className="top-bar">
                <span onClick={ return2main }>Jellyfile</span>  {/* gauche */}

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        onKeyDown={(e) => { if (e.key === 'Enter') console.log('Recherche:', e.target.value) }}
                    />
                    <button onClick={() => console.log('Recherche:', document.querySelector('.search-container input').value)}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{'color': 'var(--interface-rightbox-text)' }} />
                    </button>
                </div>
                <span className="user-btn" onClick={toggleMenu}>
                    <FontAwesomeIcon icon={faCircleUser} style={{ 'fontSize': '26' }} />
                </span>
                {menuOpen &&
                    (isMobile ? (
                        <UserModal user={user} onClose={closeMenu} />
                    ) : (
                        <UserMenu user={user} onClose={closeMenu} />
                    ))}
            </header>
            <div className="content">
                <div className="left-box">
                    Dossiers
                </div>
                <div className="right-box">
                    <MenuProfil />
                    <div id="fileZone">Zone fichiers</div>
                </div>
            </div>
        </div>
    );
}
