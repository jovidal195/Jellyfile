import UserProfile from "./userProfile";
import { useToast } from "./ToastProvider";
import { useEffect, useRef, useState } from "react";
import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";
    
export default function menuProfil({ user, setavatarLink }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const toast = useToast();
    const fileInputRef = useRef(null);

    const handleClick = () => {
        // déclenche le file picker
        fileInputRef.current?.click();
    };

    const btnSave = async () => {
        //e.preventDefault();

        const form = document.querySelector("#userForm form");
        const formData = new FormData(form);
        const body = Object.fromEntries(formData.entries());

        const res = await fetch('http://localhost:5291/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        if (res.ok) {
            toast("success", "Profil sauvegardé !");
        } else {
            toast("error", "Impossible de sauvegarder le profil !");
        }
    }

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setModalOpen(true);
        e.target.value = null; //reset le input donc le modal
    };

    useEffect(() => {
        // Bind Enter seulement quand .profile est visible
        const unbind = bindEnterForVisible(".profile", btnSave);

        // Nettoyage si le composant se démonte
        return () => unbind();
    }, []);

    const uploadAvatar = async () => {
        if (!selectedFile) return;

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("user", JSON.stringify(user));
            console.log(user);
            formData.append("compress", "avatar");

            const res = await fetch("http://localhost:5291/api/files/upload", {
                method: "POST",
                body: formData,
                credentials: "include"
            });

            if (!res.ok) {
                const text = await res.text();
                console.error(text);
                toast("error", text || "Impossible de sauvegarder l’avatar !");
                return;
            }

            const data = await res.json();
            toast("success", "Avatar sauvegardé !");
            setModalOpen(false);
            setSelectedFile(null);
            setavatarLink(`http://localhost:5291/api/files/avatar/${user.username}?t=${Date.now()}`);

            // Ici tu peux mettre à jour localement l’avatar si besoin
            // setUserAvatar(data.Path);
        } catch (err) {
            console.error(err);
            toast("error", "Erreur lors de l’upload de l’avatar !");
        }
    };

    return (
        <div className="profile submenus">

            {/* IMAGE + OVERLAY */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div id="userImg" onClick={handleClick} >
                    <FontAwesomeIcon icon={faUser} size="5x" />
                    <div className="avatar-overlay">
                        <FontAwesomeIcon icon={faPencilAlt} />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleAvatarChange}
                    />
                </div>
            </div>

            {/* FORMULAIRE */}
            <div id="userForm">
                <div>
                    <UserProfile />
                    <button onClick={btnSave}>Sauvegarder</button>
                </div>
            </div>

            {/* MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                <h3>Aperçu de l’image</h3>
                {selectedFile && (
                    <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Aperçu"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                    />
                )}
                <div style={{ marginTop: "10px" }}>
                    <button onClick={() => setModalOpen(false)}>Annuler</button>
                    <button onClick={uploadAvatar}>
                        Confirmer
                    </button>
                </div>
            </Modal>
        </div>
    );
}