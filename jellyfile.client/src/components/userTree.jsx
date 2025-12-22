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


    const renderNode = (node, key, depth = 0) => {
        const nodeKey = `${key}-${node.name}`;
        const truncatedName = node.name.length > 21 ? node.name.slice(0, 18) + "..." : node.name;

        if (node.type === "folder") {
            const isOpen = openFolders[nodeKey] ?? true;

            return (
                <div key={nodeKey} className="folder">
                    <div
                        className="clickable-tree folder-tree"
                        style={{ paddingLeft: depth > 0 ? "20px" : "0px" }}
                        onClick={() => toggleFolder(nodeKey)}
                    >
                        <FontAwesomeIcon icon={isOpen ? faFolderOpen : faFolder} style={{ color: "var(--login-button-hover)" }} />{" "}
                        {truncatedName}
                        {depth === 0 && node.name !== "Shared" && (
                            <FontAwesomeIcon
                                icon={faFolderPlus}
                                style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); handleAddFolder(node); }}
                            />
                        )}
                    </div>
                    {isOpen && node.files && node.files.length > 0 && (
                        <div className="clickable-tree file-tree">
                            {node.files.map((child, idx) => renderNode(child, `${nodeKey}-${idx}`, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        if (node.type === "file") {
            const icon = fileTypeIcons[node.fileTypeName] || faFile;

            return (
                <div
                    key={nodeKey}
                    className="file clickable-tree"
                    style={{ paddingLeft: depth > 0 ? "20px" : "0px" }}
                    onClick={() => displayFilePage(node, setFile)}
                >
                    <FontAwesomeIcon icon={icon} /> {truncatedName}
                </div>
            );
        }

        if (node.type === "rootLink") {
            return (
                <div
                    key={nodeKey}
                    className="root-link clickable-tree"
                    style={{ paddingLeft: depth > 0 ? "20px" : "0px" }}
                    onClick={() => toast("info", "Fonctionnalité pas encore implémentée")}
                >
                    <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} /> {truncatedName}
                </div>
            );
        }

        return null;
    };



    return (
        <div className="left-box">
            {tree.map((folder, idx) => renderNode(folder, idx, 0))}
        </div>
    );
}

export default userTree;