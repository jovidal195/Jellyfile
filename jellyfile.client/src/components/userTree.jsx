import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt, faFolderPlus } from '@fortawesome/free-solid-svg-icons';
import './userTree.css';
import { displayFilePage } from "../utils/displayFilePage.js";
import { useToast } from "./ToastProvider";

function userTree({ user, tree, setFile, reloadTree }) {
    const [openFolders, setOpenFolders] = useState({}); // key: folderKey, value: boolean
    const toast = useToast();

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

    const toggleFolder = (folderKey) => {
        setOpenFolders(prev => ({
            ...prev,
            [folderKey]: !prev[folderKey]
        }));
    };

    const renderNodes = (nodes, parentKey, depth = 0) => {
        return nodes.map((n, idx) => {
            const uniqueKey = `${parentKey}-${n.name}-${idx}`;

            if (!n.fileTypeName && n.files) {
                return renderFolder(n, uniqueKey, depth);
            }

            const displayName =
                n.name.length > 25
                    ? n.name.slice(0, 25 - 3) + "..."
                    : n.name;

            const icon = fileTypeIcons[n.fileTypeName] || faFile;

            return (
                <div
                    key={uniqueKey}
                    className="file-item"
                    style={{ paddingLeft: "10px" }}
                    onClick={() => displayFilePage(n, setFile)}
                >
                    <FontAwesomeIcon icon={icon} /> {displayName}
                </div>
            );
        });
    };

    const handleAddFolder = async (currentRoot) => {
        console.log("currentRoot :", currentRoot);
        console.log("Root courant :", currentRoot.name, "ID:", currentRoot.uuid);

        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;

        try {
            const res = await fetch("/api/folders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    ParentFolderUuid: currentRoot.uuid || null
                })
            });

            if (!res.ok) {
                let errorText;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorJson = await res.json();
                    errorText = errorJson.message || "Erreur création dossier";
                } else {
                    errorText = await res.text();
                }
                toast("error", errorText);
                return;
            }


            reloadTree();
        } catch (err) {
            console.error(err);
            toast("error", "Erreur inattendue lors de la création du dossier"); // ton toast
        }
    };


    const renderFolder = (folder, key, depth = 0) => {
        const folderKey = `${key}-${folder.name}`;
        const isOpen = openFolders[folderKey] ?? true;

        return (
            <div key={folderKey} className="folder">
                <div
                    className="clickable-tree folder-tree"
                    style={{ paddingLeft: depth > 0 ? "13px" : "0px" }}
                    onClick={() => {
                        toggleFolder(folderKey);
                        }
                    }
                >
                    <FontAwesomeIcon icon={isOpen ? faFolderOpen : faFolder} style={{ color: "var(--login-button-hover)"}} /> {folder.name}
                    {depth === 0 && folder.name !== "Shared" && (
                        <FontAwesomeIcon
                            icon={faFolderPlus}
                            style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleAddFolder(folder); }}
                        />
                    )}
                </div>

                {isOpen && folder.files && folder.files.length > 0 && (
                    <div className="clickable-tree file-tree">
                        {renderNodes(folder.files, folderKey, depth + 1)}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="left-box">
            {tree.map((folder, idx) => renderFolder(folder, idx, 0))}
        </div>
    );
}

export default userTree;