import UserProfile from "./userProfile";
import { useToast } from "./ToastProvider";
import { useEffect, useRef, useState } from "react";
import { bindEnterForVisible } from "../utils/bindEnterForVisible";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";
import AvatarCropModal from "./AvatarCropModal";
    
export default function menuProfil({ user, setavatarLink, avatarLink, reloadTree }) {
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

    const uploadAvatar = async (croppedBlob) => {
        if (!selectedFile) return;

        try {
            const formData = new FormData();
            formData.append("file", croppedBlob, selectedFile.name);
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
            reloadTree();

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
                    {avatarLink != "" ? (
                        <img
                            src={avatarLink}
                            alt="Avatar"
                            onError={() => setavatarLink("")}
                        />
                    ) : (
                            <FontAwesomeIcon icon={faUser} size="5x" style={{ color: "#808080"}} />
                    )}
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
            {isModalOpen && selectedFile && (
                <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <h3>Recadrer l’image</h3>
                    <AvatarCropModal
                        file={selectedFile}
                        onConfirm={async (croppedBlob) => {
                            const croppedFile = new File([croppedBlob], selectedFile.name, { type: selectedFile.type });
                            await uploadAvatar(croppedFile);
                        }}
                        onCancel={() => setModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
}