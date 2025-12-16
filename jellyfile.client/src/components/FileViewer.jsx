import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt, faTrashCan, faDownload, faDice, faUserGroup, faMobileScreenButton } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PDFFlipbook from './PDFFlipbook';
import FontPreview from './FontPreview';
import { useToast } from "./ToastProvider";
import Modal from "./Modal";
import './FileViewer.css';
import DataTable from "react-data-table-component";
import ToggleSwitch from "./ToggleSwitch";
import Select from 'react-select';

function FileViewer({ user, file, reloadTree, return2main, setFile, setavatarLink }) {
    const toast = useToast();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [modalData, setModalData] = useState(null);
    const [pinData, setPinData] = useState([]);
    const [filterText, setFilterText] = useState("");
    const [pinToDelete, setPinToDelete] = useState("");
    const [defaultPin, setDefaultPin] = useState(generateRandomPin);
    const [defaultDevicesNumber, setDefaultDevicesNumber] = useState(3);
    const [expirationEnabled, setExpirationEnabled] = useState(false);
    const [pinToEdit, setPinToEdit] = useState(null);
    const [pinsByFile, setPinsByFile] = useState({});
    const pinInputRef = useRef(null);
    const deviceInputRef = useRef(null);


    function generateRandomPin() {
        return Math.floor(10000 + Math.random() * 90000); // 5 chiffres
    }

    const customPinStyles = {
        table: {
            style: {
                backgroundColor: "var(--interface-bg)",
            },
        },
        headCells: {
            style: {
                backgroundColor: "var(--interface-bg)",
                color: "var(--login-input-text)",
                fontWeight: "bold",
            },
        },
        rows: {
            style: {
                backgroundColor: "var(--interface-bg)",
                color: "var(--login-input-text)"
            },
        },
        cells: {
            style: {
                padding: "8px",
            },
        },
    };

    const fileTypeIcons = {
        "Autre": faFile,
        "Image": faFileImage,
        "Video": faFileVideo,
        "Audio": faFileAudio,
        "Document": faFilePdf,
        "Archive": faFileArchive,
        "Binary": faFile,
        "Scripts": faFileCode,
        "Fonts": faFileAlt
    };

    const icon = fileTypeIcons[file.fileTypeName] || faFile;

    const openModal = (type, data = null) => {
        setModalType(type);
        setModalData(data);
        if (type === "addPin") {
            regenPin();
        }
        setModalOpen(true);
    };

    const subHeader = (
        <div className="btn-pin-container">
            <input
                type="text"
                placeholder="Recherche..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button
                onClick={() => openModal("addPin", null)}
                className="btn-add-pin"
            >
                Ajouter un PIN
            </button>
        </div>
    );

    const pinColumns = [
        {
            name: 'Note',
            selector: row => row.note,
        },
        {
            name: 'PIN',
            selector: row => row.pin,
        },
        {
            name: 'Expiration',
            selector: row => row.expiresAt,
        },
        {
            name: 'Modifier',
            cell: row => (
                <button onClick={() => {
                    setPinToEdit(row);
                    console.log(row);
                    setExpirationEnabled(!!row.expiresAt);
                    setModalType("editPin");
                    setModalOpen(true);
                    reloadTree();
                }}>Modifier</button>
            )
        },
        {
            name: 'Actions',
            cell: row => (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <FontAwesomeIcon icon={faTrashCan} onClick={() => { setPinToDelete(row); openModal("deletePin"); }} style={{ color: "var(--login-button-bg)" }} />
                </div>
            )
        },
        {
            name: 'Partager',
            cell: row => (
                <button onClick={() => {
                    //const pinUrl = `${window.location.origin}/pin/${file.uuid}/${file.name}`;
                    const pinUrl = `${window.location.origin}${row.linkPath}`;
                    navigator.clipboard.writeText(pinUrl)
                        .then(() => toast("info","Lien copié dans le presse-papiers !"))
                        .catch(err => console.error("Erreur lors de la copie : ", err));
                }}>URL</button>
            )
        }
    ];

    const deleteFile = async () => {
        setModalOpen(false); // fermer le modal
        try {
            const response = await fetch(`/api/files/${file.uuid}/${file.name}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                toast("success", "Fichier supprimé");
                setavatarLink(`/api/files/avatar/${user.username}?t=${Date.now()}`);
                return2main();
                reloadTree();
            } else if (response.status === 403) {
                toast("error", "Accès refusé");
            } else if (response.status === 401) {
                toast("error", "Session expirée");
            } else {
                const data = await response.json();
                toast("error", data.message || "Erreur lors de la suppression");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    };

    const handleAddPin = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        // Si expiration n'est pas activée, on supprime la clé pour envoyer null
        if (!expirationEnabled) {
            formData.delete("expiresAt");
        }

        const payload = Object.fromEntries(formData.entries());

        // Si expiresAt existe, le form envoie une string, on la convertit en ISO
        if (payload.expiresAt) {
            payload.expiresAt = new Date(payload.expiresAt).toISOString();
        } else {
            payload.expiresAt = null;
        }

        try {
            const response = await fetch(`/api/files/create/Pin/${file.uuid}/${file.name}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log(response);
            console.log(data);
        
            if (response.ok) {
                toast("success", "Pin créé");
                setPinData(prev => [...prev, data]);
                setFile(prev => ({ ...prev, pins: [...prev.pins, data] }));
                setPinsByFile(prev => ({
                    ...prev,
                    [file.uuid]: [...(prev[file.uuid] || file.pins), data]
                }));

                setModalOpen(false);
            } else if (response.status === 403) {
                toast("error", "Accès refusé");
            } else if (response.status === 401) {
                toast("error", "Session expirée");
            } else {
                toast("error", data.message || "Erreur lors de la création du PIN");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    };

    const handleEditPin = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        console.log(payload);
        payload.maxDevices = payload.devices ? parseInt(payload.devices, 10) : 3;

        if (!expirationEnabled) payload.expiresAt = null;
        else if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt).toISOString();

        try {
            const response = await fetch(`/api/files/update/Pin/${file.uuid}/${file.name}/${pinToEdit.pin}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setPinData(prev =>
                    prev.map(p => (p.pin === pinToEdit.pin ? data : p))
                );
                setFile(prev => ({
                    ...prev,
                    pins: prev.pins.map(p => p.pin === pinToEdit.pin ? data : p)
                }));


                setPinsByFile(prev => ({
                    ...prev,
                    [file.uuid]: (prev[file.uuid] || file.pins).map(p => p.pin === pinToEdit.pin ? data : p)
                }));

                setModalOpen(false);
                setPinToEdit(null);
                toast("success", "PIN modifié");
            } else {
                toast("error", data.message || "Erreur lors de la modification du PIN");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    };

    const handleDeletePin = async () => {
        try {
            const response = await fetch(`/api/files/delete/Pin/${file.uuid}/${file.name}/${pinToDelete.pin}`, {
                method: "DELETE"
            });
            if (response.ok) {
                setPinData(prev => prev.filter(p => p.pin !== pinToDelete.pin));
                setFile(prev => ({
                    ...prev,
                    pins: prev.pins.filter(p => p.pin !== pinToDelete.pin)
                }));
                setPinsByFile(prev => ({
                    ...prev,
                    [file.uuid]: (prev[file.uuid] || file.pins).filter(p => p.pin !== pinToDelete.pin)
                }));
                setPinToDelete("");
                setModalOpen(false);
                toast("success", "PIN supprimé");
            } else {
                const data = await response.json();
                toast("error", data.message || "Erreur lors de la suppression");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    }

    const regenPin = () => {
        const newPin = generateRandomPin();
        setDefaultPin(newPin);
        if (pinInputRef.current) {
            pinInputRef.current.value = newPin;
        }
    };

    const setAvatar = async (file) => {
        console.log(file);

        try {
            const response = await fetch(`/api/files/setAvatar/${file.uuid}/${file.name}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();

            if (response.ok) {
                toast("success", "Avatar selectionné");
                setavatarLink(`/api/files/avatar/${user.username}?t=${Date.now()}`);
                setModalOpen(false);
            } else if (response.status === 403) {
                toast("error", "Accès refusé");
            } else if (response.status === 401) {
                toast("error", "Session expirée");
            } else {
                toast("error", data.message || "Erreur lors de la création du PIN");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    }
    /*const updateFilePins = (updatedFile) => {
        setFile(updatedFile);
        setPinsByFile(prev => ({
            ...prev,
            [updatedFile.uuid]: updatedFile.pins
        }));
        setPinData(updatedFile.pins);
    };*/

    const downloadLink = (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name; // nom du fichier pour le téléchargement
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    useEffect(() => {
        if (file) {
            setPinData(pinsByFile[file.uuid] || file.pins);
        }
    }, [file]);


    return (
        <div className="file-viewer submenus">
            <FontAwesomeIcon icon={faCircleLeft} id="arrow" onClick={return2main} />
            <div className="file-controller">
                <h2 style={{ fontSize: window.innerWidth < 640 ? '1.2rem' : '1.5rem' }}><FontAwesomeIcon icon={icon} />{file.name}</h2>
                <div style={{ display: "flex", gap: "10px", padding: "10px" }}><FontAwesomeIcon icon={faDownload} onClick={() => downloadLink(`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`)} style={{ cursor: "pointer" }} /><FontAwesomeIcon icon={faUserGroup} onClick={() => openModal("deleteFile", null)} style={{ cursor: "pointer" }} /><FontAwesomeIcon icon={faTrashCan} onClick={() => openModal("deleteFile", null)} style={{ cursor: "pointer" }} /></div>
                {file.fileTypeName === "Image" ? (
                    <>
                        {file.isAvatar ? (
                            <div><button style={{ padding: "7px", fontSize: "0.85em", margin: "5px" }} onClick={() => setAvatar(file)}>activer l'avatar</button></div>
                        ) : null}
                        <img
                            key={file.hash}
                            src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                            alt={file.name}
                        />
                        <form>
                            <div className="line-container"><label>Auteur </label><input type="text"></input></div>
                            <div className="line-container"><span><label>Date de création </label><input type="date"></input></span></div>
                            <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                            <div><label>Généré par IA </label><ToggleSwitch checked={false} onChange={async val => { console.log(val); }} /></div>
                        </form>
                    </>
                ) : file.fileTypeName === "Video" ? (
                    <>
                        <video
                            key={file.hash}
                            controls
                            style={{
                                maxWidth: "80%",
                                maxHeight: "60vh",
                                objectFit: "contain"
                            }}
                        >
                        <source
                                src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                            type="video/mp4"
                        />
                        Ton navigateur ne supporte pas la lecture vidéo.
                        </video>
                        <form>
                            <div className="line-container"><label>Auteur </label><input type="text"></input></div>
                            <div className="line-container"><span><label>Date de création </label><input type="date"></input></span></div>
                            <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                            <div><label>Généré par IA </label><ToggleSwitch checked={false} onChange={async val => { console.log(val); }} /></div>
                        </form>
                    </>
                ) : file.fileTypeName === "Audio" ? (
                    <>
                        <audio
                            key={file.hash}
                            controls
                            style={{ width: "80%" }}
                        >
                            <source
                                src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                                type="audio/mpeg"
                            />
                            Ton navigateur ne supporte pas la lecture audio.
                        </audio>
                        <form>
                            <div className="line-container"><label>Auteur/Artiste </label><input type="text"></input></div>
                            <div className="line-container"><label>Album </label><input type="text"></input></div>
                            <div className="line-container"><label>Genre </label><input type="text"></input></div>
                            <div className="line-container"><span><label>Date de création </label><input type="date"></input></span></div>
                            <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                            <div><label>Généré par IA </label><ToggleSwitch checked={false} onChange={async val => { console.log(val); }} /></div>
                        </form>
                    </>
                ) : file.fileTypeName === "Document" && file.name.endsWith(".pdf") ? (
                        <>
                            <PDFFlipbook fileUrl={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`} />
                         
                            <form>
                                <div className="line-container"><label>Auteur </label><input type="text"></input></div>
                                <div className="line-container"><label>Editeur </label><input type="text"></input></div>
                                <div className="line-container"><span><label>Date de publication </label><input type="date"></input></span></div>
                                <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                            </form>
                        </> 
                ) : file.fileTypeName === "Fonts" ? (
                    <>
                        <FontPreview file={file}/>
                        <form>
                            <div className="line-container"><label>Auteur </label><input type="text"></input></div>
                            <div className="line-container"><span><label>Date de publication </label><input type="date"></input></span></div>
                            <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                        </form>
                    </>
                ) : (
                    <p>Type de fichier non pris en charge</p>
                )}

                <DataTable
                    className="PIN"
                    columns={pinColumns}
                    data={pinData}
                    customStyles={customPinStyles}
                    pagination
                    highlightOnHover
                    selectableRows={false}
                    persistTableHead
                    subHeader
                    subHeaderComponent={subHeader}
                    subHeaderAlign="center"
                    noHeader
                />
            </div>
            
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                {modalType === "deleteFile" && (
                    <>
                        <h3>Suppression définitive</h3>
                        <p>Voulez-vous vraiment supprimer "{file.name}" ? Cette action est irréversible.</p>
                        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px" }}>
                            <button onClick={() => setModalOpen(false)}>Annuler</button>
                            <button onClick={deleteFile} style={{ background: "red", color: "white" }}>Supprimer</button>
                        </div>
                    </>
                )}

                {modalType === "addPin" && (
                    <form className="modalPin" onSubmit={handleAddPin}>
                        <h3>Ajouter un PIN</h3>

                        <p style={{ position: "relative", display: "inline-block", margin: "0" }}><input name="pin" type="number" placeholder="PIN" required defaultValue={defaultPin} ref={pinInputRef} style={{ paddingRight: "30px" }} /><FontAwesomeIcon icon={faDice} onClick={regenPin} style={{
                            position: "absolute",
                            right: "5px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            cursor: "pointer"
                        }} /></p>
                        <p><textarea name="note" placeholder="Commentaire"></textarea></p>
                        <p style={{ position: "relative", display: "inline-block", margin: "0" }}>
                            <span title="Nombre d'appareils maximum" ><FontAwesomeIcon icon={faMobileScreenButton} style={{
                                position: "fixed",
                                paddingLeft: "5px",
                                transform: "translateY(33%)",
                            }}></FontAwesomeIcon></span><input name="maxDevices" type="number" placeholder="MaxDevices" required defaultValue={defaultDevicesNumber} ref={deviceInputRef} style={{ paddingLeft: "30px" }} />
                        </p>
                        <p>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={expirationEnabled}
                                    onChange={(e) => setExpirationEnabled(e.target.checked)}
                                />
                                Activer expiration
                            </label>
                        </p>

                        {expirationEnabled && (
                            <p>
                                <input name="expiresAt" type="datetime-local" />
                            </p>
                        )}

                        <button type="submit">Ajouter</button>
                    </form>
                )}
                {modalType === "editPin" && pinToEdit && (
                    <form className="modalPin" onSubmit={handleEditPin}>
                        <h3>Modifier le PIN</h3>

                        <p>
                            <label>PIN :</label>
                            <input type="number" value={pinToEdit.pin} disabled />
                        </p>

                        <p>
                            <textarea
                                name="note"
                                placeholder="Commentaire"
                                defaultValue={pinToEdit.note || ""}
                            />
                        </p>

                        <p style={{ position: "relative", display: "inline-block", margin: "0" }}>
                            <span title="Nombre d'appareils maximum" ><FontAwesomeIcon icon={faMobileScreenButton} style={{
                                position: "fixed",
                                paddingLeft: "5px",
                                transform: "translateY(33%)",
                            }}></FontAwesomeIcon></span><input name="devices" type="number" defaultValue={pinToEdit.maxDevices} style={{ paddingLeft: "30px" }} />
                        </p>

                        <p>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={expirationEnabled}
                                    onChange={(e) => setExpirationEnabled(e.target.checked)}
                                />
                                Activer expiration
                            </label>
                        </p>

                        {expirationEnabled && (
                            <p>
                                <input
                                    name="expiresAt"
                                    type="datetime-local"
                                    defaultValue={
                                        pinToEdit.expiresAt
                                            ? new Date(pinToEdit.expiresAt).toISOString().slice(0, 16)
                                            : ""
                                    }
                                />
                            </p>
                        )}

                        <button type="submit">Modifier</button>
                    </form>
                )}

                {modalType === "deletePin" && (
                    <Modal isOpen={true} onClose={() => setPinToDelete("")}>
                        <h3>Suppression du PIN</h3>
                        <p>Voulez-vous vraiment supprimer le PIN "{pinToDelete.pin}" ? Cette action est irréversible.</p>
                        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px" }}>
                            <button onClick={() => setPinToDelete(null)}>Annuler</button>
                            <button
                                style={{ background: "red", color: "white" }}
                                onClick={handleDeletePin}
                            >
                                Supprimer
                            </button>
                        </div>
                    </Modal>
                )}
            </Modal>
        </div>
    
  );
}

export default FileViewer;