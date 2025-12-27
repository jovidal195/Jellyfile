import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFolder,
    faFolderOpen,
    faFile,
    faFileImage,
    faFileVideo,
    faFileAudio,
    faFilePdf,
    faFileArchive,
    faFileCode,
    faFileAlt,
    faFolderPlus,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import './userTree.css';
import { displayFilePage } from "../utils/displayFilePage.js";
import { useToast } from "./ToastProvider";
import Modal from "./Modal";

function userTree({ user, tree, setFile, reloadTree, isMobile, return2main }) {
    const [stack, setStack] = useState([]); // navigation stack : [] = root view
    const [localTree, setLocalTree] = useState(tree);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);

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

    // helpers robustes pour fields venant du backend
    const getNodeType = (n) => (n?.type || n?.Type || (n?.IsFolder || n?.isFolder ? "folder" : (n?.Files || n?.files ? "folder" : "file"))).toString().toLowerCase();
    const getNodeName = (n) => n?.name || n?.Name || n?.Name || "";
    const getChildren = (n) => n?.Files || n?.files || [];

    // helpers (place-les au top du composant userTree)
    const getUuid = (n) => n?.Uuid || n?.uuid || n?.Id || null;

    const findNodeByUuid = (nodes, uuid) => {
        if (!nodes || !uuid) return null;
        for (const n of nodes) {
            if (getUuid(n) === uuid) return n;
            const children = n.Files || n.files || [];
            const found = findNodeByUuid(children, uuid);
            if (found) return found;
        }
        return null;
    };

    // order: folders first then files
    const sortChildren = (children) => {
        const childList = children.slice(); // copy
        childList.sort((a, b) => {
            const ta = getNodeType(a) === "folder" ? 0 : 1;
            const tb = getNodeType(b) === "folder" ? 0 : 1;
            if (ta !== tb) return ta - tb;
            const na = getNodeName(a).toLowerCase();
            const nb = getNodeName(b).toLowerCase();
            return na.localeCompare(nb);
        });
        return childList;
    };

    // navigation actions
    const enterFolder = (folderNode) => {
        // push the folder object onto the stack
        setStack(prev => [...prev, folderNode]);
    };

    const goUp = () => {
        setStack(prev => {
            if (prev.length === 0) return prev;
            return prev.slice(0, prev.length - 1);
        });
    };

    // Add folder (POST)
    const handleAddFolder = async (currentRoot) => {
        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;

        try {
            const res = await fetch("/api/folders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    ParentFolderUuid: currentRoot?.uuid || currentRoot?.Uuid || null
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

            // réponse attendue : { Uuid: "...", Name: "..." } ou { uuid, name }
            const createdFolder = await res.json();
            const createdUuid = createdFolder.Uuid || createdFolder.uuid;
            const createdName = createdFolder.Name || createdFolder.name;

            // deep clone localTree
            const newTree = JSON.parse(JSON.stringify(localTree || []));

            // si on est au root, il faut ajouter le dossier au bon root node (ou comme nouveau root si c'est permis)
            if (stack.length === 0) {
                // essayer d'ajouter au wrapper correspondant au currentRoot (si currentRoot fournie)
                if (currentRoot) {
                    // currentRoot peut être un wrapper original => trouver dans newTree par name/Uuid
                    const target = findNodeByUuid(newTree, currentRoot?.Uuid || currentRoot?.uuid) ||
                        newTree.find(r => (r.Name || r.name) === (currentRoot?.Name || currentRoot?.name));
                    if (target) {
                        target.files = target.files || [];
                        target.files.push({
                            Type: "folder",
                            name: createdName,
                            Name: createdName,
                            Uuid: createdUuid,
                            uuid: createdUuid,
                            files: []
                        });
                    } else {
                        // si on ne trouve pas le wrapper, on ajoute un root simple
                        newTree.push({
                            Type: "folder",
                            name: createdName,
                            Name: createdName,
                            Uuid: createdUuid,
                            uuid: createdUuid,
                            files: []
                        });
                    }
                    console.log("new tree post-append (a) :", newTree);
                } else {
                    // pas de currentRoot : ajoute au tableau racine
                    newTree.push({
                        Type: "folder",
                        name: createdName,
                        Name: createdName,
                        Uuid: createdUuid,
                        uuid: createdUuid,
                        files: []
                    });
                    console.log("new tree post-append (b) :", newTree);
                }
            } else {
                // on est dans un dossier ; trouver le dossier courant par UUID et y ajouter le sous-dossier
                const current = stack[stack.length - 1];
                console.log(current);
                const target = findNodeByUuid(newTree, current?.Uuid || current?.uuid);
                console.log(target)
                if (target) {
                    target.files = target.files || [];
                    target.files.push({
                        Type: "folder",
                        name: createdName,
                        Name: createdName,
                        Uuid: createdUuid,
                        uuid: createdUuid,
                        files: []
                    });
                    console.log("new tree post-append (c) :", newTree);
                } else {
                    // fallback : si on ne trouve pas, ajoute au top-level (dégradé)
                    newTree.push({
                        Type: "folder",
                        name: createdName,
                        Name: createdName,
                        Uuid: createdUuid,
                        uuid: createdUuid,
                        files: []
                    });
                    console.log("new tree post-append (d) :", newTree);
                }
            }

            // appliquer les nouveaux states
            setLocalTree(newTree);

            // Optionnel : si tu veux forcer un reload réseau en plus, appelle reloadTree() après
            // await reloadTree(); // si reloadTree retourne et met à jour tree prop
        } catch (err) {
            console.error(err);
            toast("error", "Erreur inattendue lors de la création du dossier");
        }
    };

    // render helpers
    const renderFileItem = (node, key, depth) => {
        const name = getNodeName(node);
        const displayName = name.length > 21 ? name.slice(0, 18) + "..." : name;
        const icon = fileTypeIcons[node?.fileTypeName || node?.FileTypeName] || faFile;
        return (
            <div key={key} className="file clickable-tree" style={{ paddingLeft: depth > 0 ? "0px" : "20px" }}
                onClick={() => displayFilePage(node, setFile)}>
                <FontAwesomeIcon icon={icon} /> {displayName}
            </div>
        );
    };

    const renderFolderItem = (node, key, depth, isTopLevelFolder = false) => {
        const name = getNodeName(node);
        const displayName = name.length > 21 ? name.slice(0, 18) + "..." : name;
        return (
            <div key={key} className="folder">
                <div className="clickable-tree folder-tree"
                    style={{ paddingLeft: depth > 0 ? "20px" : "0px" }}>
                    <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} />{" "}
                    <span style={{ cursor: "pointer" }} onClick={() => enterFolder(node)}>{displayName}</span>
                    {depth === 0 && isTopLevelFolder && node.name !== "Shared" && (
                        <FontAwesomeIcon
                            icon={faFolderPlus}
                            style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleAddFolder(node); }}
                        />
                    )}
                </div>
            </div>
        );
    };

    // view builder: returns array of nodes to display for the current view
    // when stack empty -> show each top-level folder expanded (its children displayed),
    // when stack non-empty -> show single folder view with ../ as first entry + children (dirs first)
    const buildCurrentView = () => {
        // root view: tree is an array of root folders (e.g. "Mes fichiers", "Shared", or users)
        // For each root entry we render its children inline (files + subfolders)
        // produce an array of wrapper nodes: each wrapper has type 'folder' and children in Files
        const baseTree = Array.isArray(localTree) && localTree.length ? localTree : (Array.isArray(tree) ? tree : []);

        if (stack.length === 0) {
            return baseTree.map((rootNode, rootIdx) => ({
                _isWrapper: true,
                type: "folder",
                name: getNodeName(rootNode),
                files: sortChildren(getChildren(rootNode)),
                _original: rootNode,
                _isTopLevel: true
            }));
        } else {
            // Remap current to the instance inside localTree when possible (stack entries may be old refs)
            const current = stack[stack.length - 1];
            const currentUuid = current?.Uuid || current?.uuid || null;
            const currentInTree = currentUuid ? findNodeByUuid(baseTree, currentUuid) : current;
            const children = sortChildren(getChildren(currentInTree || current));
            const upNode = { _isUp: true, type: "up", name: "../" };

            const headerNode = {
                _isParentHeader: true,
                name: getNodeName(currentInTree || current),
                _original: currentInTree || current
            };

            return [headerNode, upNode, ...children];
        }
    };

    // single recursive renderer for items in the current view
    const renderViewItem = (node, idx, depth = 0) => {
        if (node._isUp) {
            return (
                <div key={`up-${idx}`} className="root-link clickable-tree" style={{ paddingLeft: "20px" }} onClick={goUp}>
                    <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                </div>
            );
        }

        if (node._isParentHeader) {
            const original = node._original;
            return (
                <div key={`header-${idx}`} className="clickable-tree folder-tree" style={{ paddingLeft: depth > 0 ? "20px" : "0px", fontWeight: "bold" }}>
                    <FontAwesomeIcon icon={faFolderOpen} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                    {original.name !== "Shared" && original.name !== "Avatars" && (
                        <FontAwesomeIcon
                            icon={faFolderPlus}
                            style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleAddFolder(original); }}
                        />
                    )}
                    {original.name !== "Avatars" && (
                        <FontAwesomeIcon
                            icon={faTrash}
                            style={{
                                float: "right",
                                paddingTop: "5px",
                                marginRight: "8px",
                                cursor: "pointer",
                                color: "#b94a48"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(node._original);
                            }}
                        />
                    )}
                </div>
            );
        }

        if (node._isWrapper) {
            const headerKey = `wrapper-${idx}`;
            const children = node.files || [];
            return (
                <div key={headerKey} className="folder">
                    <div className="clickable-tree folder-tree">
                        <FontAwesomeIcon icon={faFolderOpen} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                        {node._isTopLevel && node._original.name !== "Shared" && (
                            <FontAwesomeIcon
                                icon={faFolderPlus}
                                style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); handleAddFolder(node._original); }}
                            />
                        )}
                    </div>
                    <div className="clickable-tree file-tree" style={{ marginLeft: "6px" }}>
                        {children.map((child, cidx) => renderViewItem(child, `${idx}-${cidx}`, depth + 1))}
                    </div>
                </div>
            );
        }

        const type = getNodeType(node);
        const key = `node-${idx}-${getNodeName(node)}`;

        if (type === "folder") {
            return (
                <div key={key} className="folder">
                    <div className="clickable-tree folder-tree" style={{ paddingLeft: depth > 0 ? "0px" : "20px" }}>
                        <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} />{" "}
                        <span style={{ cursor: "pointer" }} onClick={() => enterFolder(node)}>{getNodeName(node)}</span>
                    </div>
                </div>
            );
        }

        if (type === "file") {
            return renderFileItem(node, key, depth);
        }

        return null;
    };

    const currentItems = buildCurrentView();

    const openDeleteModal = (folder) => {
        setFolderToDelete(folder);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setFolderToDelete(null);
    };

    const deleteWithPromote = async () => {
        if (!folderToDelete) return;

        try {
            const res = await fetch(`/api/folders/promote/${folderToDelete.uuid}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) {
                const data = await res.json();
                toast("error", data?.message || "Erreur lors de la suppression");
                return;
            }

            
            closeDeleteModal();
            await reloadTree();
            setStack(prevStack => prevStack.slice(0, prevStack.length - 1));
            return2main();

        } catch (err) {
            console.error(err);
            toast("error", "Erreur inattendue lors de la suppression");
        }
    };

    const deleteWithCascade = async () => {
        if (!folderToDelete?.Uuid && !folderToDelete?.uuid) return;

        const uuid = folderToDelete.Uuid || folderToDelete.uuid;

        try {
            const res = await fetch(`/api/folders/delete-recursive/${uuid}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                let msg = "Erreur suppression dossier";
                const ct = res.headers.get("content-type");
                if (ct && ct.includes("application/json")) {
                    const json = await res.json();
                    msg = json.message || msg;
                }
                toast("error", msg);
                return;
            }

            toast("success", "Dossier supprimé avec son contenu");

            // Si on était dans ce dossier, on remonte d'un niveau
            setStack(prev => {
                if (!prev.length) return prev;

                const current = prev[prev.length - 1];
                const currentUuid = current?.Uuid || current?.uuid;

                if (currentUuid === uuid) {
                    return prev.slice(0, prev.length - 1);
                }
                return prev;
            });

            closeDeleteModal();

            // Recharge proprement depuis le backend
            await reloadTree();
            return2main();
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau lors de la suppression");
        }
    };


    useEffect(() => {
        // replace localTree with new prop and remap stack entries to the new objects (by UUID)
        setLocalTree(tree);

        setStack(prevStack => {
            if (!Array.isArray(tree) || !tree.length) return prevStack;
            return prevStack.map(s => {
                const uuid = s?.Uuid || s?.uuid;
                if (!uuid) return s;
                const found = findNodeByUuid(tree, uuid);
                return found || s;
            });
        });
    }, [tree]);


    return (
        <div className="left-box">
            {currentItems.map((item, idx) => renderViewItem(item, idx, 0))}
            <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
                <h3>Supprimer le dossier</h3>

                <p>
                    Vous vous apprêtez à supprimer le dossier <strong style={{ border: "var(--interface-text) solid 0.5px", padding: "5px", borderRadius: "5px" }}><FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} /> {folderToDelete?.name}</strong> de façon définitive. Voulez-vous faire remonter l'arborescence son contenu afin de le garder ?<br/><strong><em>attention cette action est irréversible</em></strong>
                </p>

                <div className="modal-actions" style={{ display: "inline-flex", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
                    <button onClick={closeDeleteModal}>
                        Annuler
                    </button>

                    <button onClick={deleteWithPromote}>
                        Oui
                    </button>

                    <button className="danger" onClick={deleteWithCascade}>
                        Non, tout supprimer
                    </button>

                </div>
            </Modal>

        </div>
    );
}

export default userTree;
