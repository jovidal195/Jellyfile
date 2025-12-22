import { useState, useRef } from "react";
import { useToast } from "./ToastProvider";
import './FileZone.css';
import Modal from "./Modal";
import { displayFilePage } from "../utils/displayFilePage.js";

export default function FileZone({ user, reloadTree, tree, setFile }) {
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const inputRef = useRef(null);
    const toast = useToast();
    const [isModalOpen, setModalOpen] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        inputRef.current.click();
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user", JSON.stringify(user));
        console.log(tree);
        console.log(tree[0]);
        formData.append("folderUuid", tree[0].uuid);
        setModalOpen(true);

        try {
            const res = await fetch(`/api/files/upload`, {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const data = await res.json();

            if (res.ok) {
                toast("success", "Fichier téléversé");
                setModalOpen(false)
                reloadTree();
                displayFilePage(data, setFile);
            } else {
                console.error(res);
                toast("error", data.message);
                setModalOpen(false)
            }
        } catch (err) {
            console.log(err);
            toast("error", err.message || String(err));
            setModalOpen(false)
        }
    };

    return (
        <div className="home">
            <div
                id="fileZone"
                className={`file-zone ${dragActive ? "drag-active" : ""}`}
                onClick={handleClick}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={inputRef}
                    style={{ display: "none" }}
                    onChange={handleChange}
                />
                {uploadedFiles.length === 0 ? (
                    <p>Glissez un fichier ici ou cliquez pour sélectionner</p>
                ) : (
                    <div className="file-list">
                        {uploadedFiles.map((f, idx) => (
                            <div key={idx} className="file-card">
                                <p><strong>Nom:</strong> {f.name}</p>
                                <p><strong>Taille:</strong> {f.size} bytes</p>
                                <p><strong>Type:</strong> {f.type}</p>
                                <p><strong>Droits:</strong> {f.permission}</p>
                                <p><strong>Exp:</strong> {f.expiration ?? "N/A"}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                <div className="modal-loading">
                    <div className="spinner"></div>
                    <p>Chargement...</p>
                </div>
            </Modal>
        </div>
    );
}
