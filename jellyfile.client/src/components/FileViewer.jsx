import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt, faTrashCan, faDownload, faDice, faUserGroup, faMobileScreenButton, faShareAlt, faCircleUser } from '@fortawesome/free-solid-svg-icons';
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
import AsyncCreatableSelect from 'react-select/async-creatable';
import { updateNodeMetadata } from "../utils/nodesManager";

function FileViewer({ user, file, reloadTree, return2main, setFile, setavatarLink, setTree }) {
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
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState(file.tags || []);
    const pinInputRef = useRef(null);
    const deviceInputRef = useRef(null);

    //metadatas
    const [metadata, setMetadata] = useState(null);
    const [loadingMeta, setLoadingMeta] = useState(false);

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
            selector: row => {
                if (!row.expiresAt) return '';
                const utcDate = new Date(row.expiresAt); // ISO UTC depuis la DB
                // transforme en heure locale
                const localDate = new Date(
                    utcDate.getTime() - utcDate.getTimezoneOffset() * 60000
                );
                return localDate.toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' });
            }
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

    const normalizePin = (pin) => {
        if (!pin.expiresAt) return pin;

        // Supprime juste le Z à la fin, si présent
        const expiresAt = pin.expiresAt.endsWith('Z')
            ? pin.expiresAt.slice(0, -1)
            : pin.expiresAt;

        return {
            ...pin,
            expiresAt
        };
    };

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

        if (payload.expiresAt) {
            payload.expiresAt = new Date(payload.expiresAt)
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
        
            if (response.ok) {
                toast("success", "Pin créé");

                const normalized = normalizePin(data);

                setPinData(prev => [...(prev || []), normalized]);
                console.log(pinData);
                setFile(prev => ({ ...prev, pins: [...(prev.pins || []), normalized] }));
                console.log(File);
                setPinsByFile(prev => ({
                    ...prev,
                    [file.uuid]: [...(prev[file.uuid] || file.pins || []), normalized]
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
        else if (payload.expiresAt) payload.expiresAt = expirationEnabled
            ? new Date(payload.expiresAt)
            : null;

        try {
            const response = await fetch(`/api/files/update/Pin/${file.uuid}/${file.name}/${pinToEdit.pin}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                const normalized = normalizePin(data);

                setPinData(prev =>
                    prev.map(p => (p.pin === pinToEdit.pin ? normalized : p))
                );
                setFile(prev => ({
                    ...prev,
                    pins: prev.pins.map(p => p.pin === pinToEdit.pin ? normalized : p)
                }));


                setPinsByFile(prev => ({
                    ...prev,
                    [file.uuid]: (prev[file.uuid] || file.pins).map(p => p.pin === pinToEdit.pin ? normalized : p)
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

    const downloadLink = (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name; // nom du fichier pour le téléchargement
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const updateMetadata = async (changes) => {
        try {
            const resp = await fetch(`/api/files/${encodeURIComponent(file.uuid)}/metadata`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(changes)
            });

            if (resp.ok) {
                const updatedMeta = await resp.json();
                //console.log(updatedMeta);
                setFile(prev => {
                    const next = {
                        ...prev,
                        metadata: { ...prev.metadata, ...updatedMeta }
                    };
                    updateNodeMetadata(setTree, file.uuid, updatedMeta);
                    return next;
                });

            } else {
                const err = await resp.json().catch(() => ({ message: "Erreur" }));
                toast("error", err.message || "Erreur sauvegarde méta");
            }
        } catch (err) {
            console.error("meta patch error", err);
            toast("error", "Erreur réseau");
        }
    };

    const changePermission = async (file, setFile) => {
        const toPublic = file.permission !== 0;
        const permission = toPublic ? 0 : 2;

        try {
            const response = await fetch(`/api/files/${file.uuid}/${file.name}/permission`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permission: permission })
            });

            const data = await response.json();

            if (response.ok) {
                // Met à jour le fichier local pour que le toggle reflète la nouvelle permission
                setFile(prev => ({ ...prev, permission: data.newPermission }));
            } else if (response.status === 403) {
                toast("error", "Accès refusé");
            } else if (response.status === 401) {
                toast("error", "Session expirée");
            } else {
                toast("error", data.message || "Erreur lors de la modification de la permission");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau ou serveur");
        }
    };

    const syncFileTags = async (tagsToSync) => {
        try {
            await fetch(`/api/files/${file.uuid}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(tagsToSync.map(t => t.name))
            });
        } catch (err) {
            console.error("Erreur sync tags", err);
        }
    };

    useEffect(() => {
        if (file) {
            setPinData(pinsByFile[file.uuid] || file.pins);
        }
    }, [file]);

    useEffect(() => {
        if (!file.uuid) return;

        // récupérer les tags attachés au fichier
        fetch(`/api/files/${file.uuid}/tags`)
            .then(r => r.ok ? r.json() : [])
            .then(fileTags => setSelectedTags(fileTags || []))
            .catch(err => {
                console.error("Impossible de charger les tags du fichier :", err);
                setSelectedTags([]);
            });

        // récupérer tous les tags existants pour le menu
        const loadTags = async () => {
            try {
                const r = await fetch(`/api/files/tags/search?query=`, { credentials: "include" });
                const all = r.ok ? await r.json() : [];
                setTags(Array.isArray(all) ? all : []);
            } catch (err) {
                console.error("Impossible de charger tous les tags :", err);
                setTags([]);
            }
        };

        loadTags();
    }, [file]);

    const LANGUAGE_OPTIONS = [
        "None","Français", "English", "Español", "Deutsch", "Italiano", "Português",
        "中文 (简体)", "中文 (繁體)", "日本語", "한국어", "Русский",
        "العربية", "Türkçe", "Nederlands", "Svenska", "Norsk", "Dansk",
        "Suomi", "Hindi", "Bengali", "Urdu", "Polski", "Čeština", "Ελληνικά", "עברית"
    ].map(l => ({ value: l, label: l }));

    const filterLanguages = (input) => {
        const q = (input || "").toLowerCase();
        if (!q) return LANGUAGE_OPTIONS;
        return LANGUAGE_OPTIONS.filter(o =>
            o.label.toLowerCase().includes(q)
        );
    };

    // en haut du composant FileViewer
    const [languageValue, setLanguageValue] = useState(
        file?.metadata?.language ? { value: file.metadata.language, label: file.metadata.language } : null
    );
    const [subtitleValue, setSubtitleValue] = useState(
        file?.metadata?.subtitleLanguage ? { value: file.metadata.subtitleLanguage, label: file.metadata.subtitleLanguage } : null
    );

    // garde en sync quand file change (quand l'utilisateur ouvre un autre fichier)
    useEffect(() => {
        if (!file) return;
        //console.log(file.metadata);
        setLanguageValue(
            file.metadata?.language ? { value: file.metadata.language, label: file.metadata.language } : null
        );
        setSubtitleValue(
            file.metadata?.subtitleLanguage ? { value: file.metadata.subtitleLanguage, label: file.metadata.subtitleLanguage } : null
        );
    }, [file?.uuid, file?.metadata?.language, file?.metadata?.subtitleLanguage]);


    return (
        <div className="file-viewer submenus">
            <FontAwesomeIcon icon={faCircleLeft} id="arrow" onClick={return2main} />
            <div className="file-controller">
                <h2 style={{ fontSize: window.innerWidth < 640 ? '1.2rem' : '1.5rem' }}><FontAwesomeIcon icon={icon} />{file.name}</h2>
                <div style={{ display: "flex", gap: "10px", padding: "10px" }}>
                    <FontAwesomeIcon icon={faDownload} onClick={() => downloadLink(`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`)} style={{ cursor: "pointer" }} />
                    {file.permission === 0 && (
                        <FontAwesomeIcon
                            icon={faShareAlt} // ou un autre icône de partage
                            onClick={() => {
                                const url = `${window.location.origin}/api/files/${file.uuid}/${file.name}?t=${Date.now()}`;
                                navigator.clipboard.writeText(url)
                                    .then(() => toast("success", "Lien copié dans le presse-papier"))
                                    .catch(() => toast("error", "Impossible de copier le lien"));
                            }}
                            style={{ cursor: "pointer" }}
                        />
                    )}
                    <FontAwesomeIcon icon={faUserGroup} onClick={() => openModal("deleteFile", null)} style={{ cursor: "pointer" }} />
                    <FontAwesomeIcon icon={faTrashCan} onClick={() => openModal("deleteFile", null)} style={{ cursor: "pointer" }} />
                </div>
                {file.owner !== undefined && (
                    <div title={`ce fichier à été créer par ${file.owner}`}>
                        <img alt="Avatar" src={`/api/files/avatar/${file.owner}?t=${Date.now()}`} style={{ marginBottom: "0px", objectFit: "cover !important", width: "43px", height: "35px", borderRadius:"50%"}}
                            onError={(e) => {
                                e.currentTarget.onerror = null; // empêche boucle infinie si fallback échoue
                                e.currentTarget.style.display = "none";
                                e.target.nextSibling.style.display = "initial";
                            }}
                            onLoad={(e) => {
                                e.currentTarget.style.display = "initial";
                                e.target.nextSibling.style.display = "none";
                            }}
                        />
                        <FontAwesomeIcon 
                            icon={faCircleUser} 
                            className="owner-avatar-fallback" 
                            style={{ fontSize: '30px', display: 'none' }}
                        />
                    </div>
                )}
                {!file.isAvatar ? (
                    <div style={{ padding: "10px", alignItems: "center", display: "flex", gap: "5px" }}><label>Public ? </label><ToggleSwitch checked={file.permission == 0} onChange={() => changePermission(file, setFile)} /></div>
                ): null}
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


                            <AsyncCreatableSelect
                                isMulti
                                defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                className="tags-select"
                                classNamePrefix="tags-select"
                                placeholder="Ajouter des tags..."
                                loadOptions={async (inputValue) => {
                                    // Si input vide, retourner les tags déjà préchargés
                                    if (!inputValue) {
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return tags
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    }

                                    // Requête côté serveur
                                    try {
                                        const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                        if (!r.ok) return [];
                                        const data = await r.json();
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return data
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    } catch {
                                        return [];
                                    }
                                }}
                                onChange={async (values) => {
                                    const unique = Array.from(new Set(values.map(v => v.value)))
                                        .map(name => ({ name }));
                                    setSelectedTags(unique);
                                    await syncFileTags(unique);
                                }}
                            />


                        <form>
                            <div className="line-container">
                                <label>Auteur</label>
                                <input
                                    type="text"
                                    value={file.metadata?.author || ""}
                                    onChange={async e => updateMetadata({ author: e.target.value })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Date de création</label>
                                <input
                                    type="date"
                                    value={file.metadata?.creationDate?.split("T")[0] || ""}
                                    onChange={async e => updateMetadata({ creationDate: e.target.value })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Copyright</label>
                                <input
                                    type="text"
                                    value={file.metadata?.copyrightHolder || ""}
                                    onChange={async e => updateMetadata({ copyrightHolder: e.target.value })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Licence</label>
                                <input
                                    type="text"
                                    value={file.metadata?.license || ""}
                                    onChange={async e => updateMetadata({ license: e.target.value })}
                                />
                            </div>

                            <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                                <label>Généré par IA</label>
                                <ToggleSwitch
                                    checked={file.metadata?.isAiGenerated}
                                    onChange={async val => updateMetadata({ isAiGenerated: val })}
                                />
                            </div>

                            <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                                <label>Vectoriel</label>
                                <ToggleSwitch
                                    checked={file.metadata?.isVector}
                                    onChange={async val => updateMetadata({ isVector: val })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Format</label>
                                <input
                                    type="text"
                                    value={file.metadata?.format || ""}
                                    onChange={async e => updateMetadata({ format: e.target.value })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Color Mode</label>
                                <input
                                    type="text"
                                    value={file.metadata?.colorMode || ""}
                                    onChange={async e => updateMetadata({ colorMode: e.target.value })}
                                />
                            </div>

                            <div className="line-container">
                                <label>DPI</label>
                                <input
                                    type="number"
                                    value={file.metadata?.dpi || ""}
                                    onChange={async e => updateMetadata({ dpi: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Bit Depth</label>
                                <input
                                    type="number"
                                    value={file.metadata?.bitDepth || ""}
                                    onChange={async e => updateMetadata({ bitDepth: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="line-container">
                                <label>Collections</label>
                                <input
                                    type="text"
                                    value={file.metadata?.collections || ""}
                                    onChange={async e => updateMetadata({ collections: e.target.value })}
                                />
                            </div>
                        </form>
                    </>
                ) : file.fileTypeName === "Video" ? (
                    <>
                        <video
                            key={file.uuid}
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
                        <AsyncCreatableSelect
                                isMulti
                                defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                className="tags-select"
                                classNamePrefix="tags-select"
                                placeholder="Ajouter des tags..."
                                loadOptions={async (inputValue) => {
                                    // Si input vide, retourner les tags déjà préchargés
                                    if (!inputValue) {
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return tags
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    }

                                    // Requête côté serveur
                                    try {
                                        const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                        if (!r.ok) return [];
                                        const data = await r.json();
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return data
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    } catch {
                                        return [];
                                    }
                                }}
                                onChange={async (values) => {
                                    const unique = Array.from(new Set(values.map(v => v.value)))
                                        .map(name => ({ name }));
                                    setSelectedTags(unique);
                                    await syncFileTags(unique);
                                }}
                            />
                            <form>

                                <div className="line-container">
                                    <label>Auteur</label>
                                    <input
                                        type="text"
                                        value={file.metadata?.author || ""}
                                        onChange={async e => updateMetadata({ author: e.target.value })}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Date de création</label>
                                    <input
                                        type="date"
                                        value={file.metadata?.creationDate?.split("T")[0] || ""}
                                        onChange={async e => updateMetadata({ creationDate: e.target.value })}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Copyright</label>
                                    <input
                                        type="text"
                                        value={file.metadata?.copyrightHolder || ""}
                                        onChange={async e => updateMetadata({ copyrightHolder: e.target.value })}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Licence</label>
                                    <input
                                        type="text"
                                        value={file.metadata?.license || ""}
                                        onChange={async e => updateMetadata({ license: e.target.value })}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Langue</label>
                                    <AsyncCreatableSelect
                                        isClearable
                                        cacheOptions
                                        defaultOptions={LANGUAGE_OPTIONS}
                                        loadOptions={async (inputValue) => filterLanguages(inputValue)}
                                        value={languageValue}
                                        onChange={(opt) => {
                                            if (opt === null) {
                                                setLanguageValue(null);
                                                updateMetadata({ language: null });
                                                return;
                                            }
                                            setLanguageValue(opt);
                                            updateMetadata({ language: opt.value });
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const custom = { value: inputValue, label: inputValue };
                                            setLanguageValue(custom);
                                            updateMetadata({ language: inputValue });
                                        }}
                                        placeholder="Sélectionnez ou entrez une langue..."
                                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Langue des sous-titres</label>
                                    <AsyncCreatableSelect
                                        isClearable
                                        cacheOptions
                                        defaultOptions={LANGUAGE_OPTIONS}
                                        loadOptions={async (inputValue) => filterLanguages(inputValue)}
                                        value={subtitleValue}
                                        onChange={(opt) => {
                                            if (opt === null) {
                                                setSubtitleValue(null);
                                                updateMetadata({ subtitleLanguage: null });
                                                return;
                                            }
                                            setSubtitleValue(opt);
                                            updateMetadata({ subtitleLanguage: opt.value });
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const custom = { value: inputValue, label: inputValue };
                                            setSubtitleValue(custom);
                                            updateMetadata({ subtitleLanguage: inputValue });
                                        }}
                                        placeholder="Sélectionnez ou entrez la langue des sous-titres..."
                                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                                    />
                                </div>

                                <div className="line-container">
                                    <label>Version</label>
                                    <input
                                        type="text"
                                        value={file.metadata?.version || ""}
                                        onChange={async e => updateMetadata({ version: e.target.value })}
                                    />
                                </div>

                                <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                                    <label>Généré par IA</label>
                                    <ToggleSwitch
                                        checked={file.metadata?.isAiGenerated}
                                        onChange={async val => updateMetadata({ isAiGenerated: val })}
                                    />
                                </div>

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
                        <AsyncCreatableSelect
                                isMulti
                                defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                className="tags-select"
                                classNamePrefix="tags-select"
                                placeholder="Ajouter des tags..."
                                loadOptions={async (inputValue) => {
                                    // Si input vide, retourner les tags déjà préchargés
                                    if (!inputValue) {
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return tags
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    }

                                    // Requête côté serveur
                                    try {
                                        const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                        if (!r.ok) return [];
                                        const data = await r.json();
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return data
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    } catch {
                                        return [];
                                    }
                                }}
                                onChange={async (values) => {
                                    const unique = Array.from(new Set(values.map(v => v.value)))
                                        .map(name => ({ name }));
                                    setSelectedTags(unique);
                                    await syncFileTags(unique);
                                }}
                            />
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
                             <AsyncCreatableSelect
                                    isMulti
                                    defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                    value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                    className="tags-select"
                                    classNamePrefix="tags-select"
                                    placeholder="Ajouter des tags..."
                                    loadOptions={async (inputValue) => {
                                        // Si input vide, retourner les tags déjà préchargés
                                        if (!inputValue) {
                                            const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                            return tags
                                                .filter(t => !existingNames.has(t.name.toLowerCase()))
                                                .map(t => ({ value: t.name, label: t.name }));
                                        }

                                        // Requête côté serveur
                                        try {
                                            const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                            if (!r.ok) return [];
                                            const data = await r.json();
                                            const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                            return data
                                                .filter(t => !existingNames.has(t.name.toLowerCase()))
                                                .map(t => ({ value: t.name, label: t.name }));
                                        } catch {
                                            return [];
                                        }
                                    }}
                                    onChange={async (values) => {
                                        const unique = Array.from(new Set(values.map(v => v.value)))
                                            .map(name => ({ name }));
                                        setSelectedTags(unique);
                                        await syncFileTags(unique);
                                    }}
                                />
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
                        <AsyncCreatableSelect
                                isMulti
                                defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                className="tags-select"
                                classNamePrefix="tags-select"
                                placeholder="Ajouter des tags..."
                                loadOptions={async (inputValue) => {
                                    // Si input vide, retourner les tags déjà préchargés
                                    if (!inputValue) {
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return tags
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    }

                                    // Requête côté serveur
                                    try {
                                        const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                        if (!r.ok) return [];
                                        const data = await r.json();
                                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                        return data
                                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                                            .map(t => ({ value: t.name, label: t.name }));
                                    } catch {
                                        return [];
                                    }
                                }}
                                onChange={async (values) => {
                                    const unique = Array.from(new Set(values.map(v => v.value)))
                                        .map(name => ({ name }));
                                    setSelectedTags(unique);
                                    await syncFileTags(unique);
                                }}
                            />
                        <form>
                            <div className="line-container"><label>Auteur </label><input type="text"></input></div>
                            <div className="line-container"><span><label>Date de publication </label><input type="date"></input></span></div>
                            <div className="line-container"><label>Copyright </label><input type="text"></input></div>
                        </form>
                    </>
                ) : (
                    <>
                        <p>Type de fichier non pris en charge</p>
                        <AsyncCreatableSelect
                                    isMulti
                                    defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                                    value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                                    className="tags-select"
                                    classNamePrefix="tags-select"
                                    placeholder="Ajouter des tags..."
                                    loadOptions={async (inputValue) => {
                                        // Si input vide, retourner les tags déjà préchargés
                                        if (!inputValue) {
                                            const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                            return tags
                                                .filter(t => !existingNames.has(t.name.toLowerCase()))
                                                .map(t => ({ value: t.name, label: t.name }));
                                        }

                                        // Requête côté serveur
                                        try {
                                            const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                                            if (!r.ok) return [];
                                            const data = await r.json();
                                            const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                                            return data
                                                .filter(t => !existingNames.has(t.name.toLowerCase()))
                                                .map(t => ({ value: t.name, label: t.name }));
                                        } catch {
                                            return [];
                                        }
                                    }}
                                    onChange={async (values) => {
                                        const unique = Array.from(new Set(values.map(v => v.value)))
                                            .map(name => ({ name }));
                                        setSelectedTags(unique);
                                        await syncFileTags(unique);
                                    }}
                                />
                    </>
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
                                            ? (() => {
                                                const utcDate = new Date(pinToEdit.expiresAt);
                                                const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);

                                                const yyyy = localDate.getFullYear();
                                                const mm = String(localDate.getMonth() + 1).padStart(2, '0');
                                                const dd = String(localDate.getDate()).padStart(2, '0');
                                                const hh = String(localDate.getHours()).padStart(2, '0');
                                                const min = String(localDate.getMinutes()).padStart(2, '0');

                                                return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
                                            })()
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