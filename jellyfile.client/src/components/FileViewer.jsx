import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt, faTrashCan, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useState } from "react";
import PDFFlipbook from './PDFFlipbook';
import FontPreview from './FontPreview';
import { useToast } from "./ToastProvider";
import Modal from "./Modal";

function FileViewer({ file, reloadTree, return2main }) {
    const toast = useToast();
    const [modalOpen, setModalOpen] = useState(false);

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

    const deleteFile = async () => {
        setModalOpen(false); // fermer le modal
        try {
            const response = await fetch(`/api/files/${file.uuid}/${file.name}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                toast("success", "Fichier supprimé");
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

    return (
        <div className="file-viewer submenus">
            <FontAwesomeIcon icon={faCircleLeft} id="arrow" onClick={return2main} />
            <div style={{
                    display: "flex",
                    flexDirection: "column",   // image au-dessus du texte
                    justifyContent: "center",  // centre verticalement
                    alignItems: "center",      // centre horizontalement
                    maxHeight: "100vh",            // prend toute la hauteur de la fenêtre
                    overflowWrap: "break-word",
                    wordBreak: "break-all"
                }}>
                <h2 style={{ fontSize: window.innerWidth < 640 ? '1.2rem' : '1.5rem' }}><FontAwesomeIcon icon={icon} />{file.name}</h2>
                <div><a href={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}><FontAwesomeIcon icon={faDownload} /></a><FontAwesomeIcon icon={faTrashCan} onClick={() => setModalOpen(true)} /></div>
                {file.fileTypeName === "Image" ? (
                    <img
                        key={file.hash}
                        src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                        alt={file.name}
                        style={{ maxWidth: "80%", maxHeight: "80vh", objectFit: "contain", overflow: "hidden" }}
                    />
                ) : file.fileTypeName === "Video" ? (
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
                ) : file.fileTypeName === "Audio" ? (
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
                ) : file.fileTypeName === "Document" && file.name.endsWith(".pdf") ? (
                         <PDFFlipbook fileUrl={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`} />
                ) : file.fileTypeName === "Fonts" ? (
                    <FontPreview file={file}/>
                ) : (
                    <p>Type de fichier non pris en charge</p>
                )}
                <p>dfsafasd</p>
                <p>dfsafasd</p>
                <p>dfsafasd</p>
                <p>dfsafasd</p>
            </div>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                <h3>Suppression définitive</h3>
                <p>Voulez-vous vraiment supprimer "{file.name}" ? Cette action est irréversible.</p>
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px" }}>
                    <button onClick={() => setModalOpen(false)}>Annuler</button>
                    <button onClick={deleteFile} style={{ background: "red", color: "white" }}>Supprimer</button>
                </div>
            </Modal>
        </div>
    
  );
}

export default FileViewer;