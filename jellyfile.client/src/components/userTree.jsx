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
import { findNodeByUuid, findParentUuid, getNodeType, getNodeName, getChildren, getUuid } from '../utils/nodesManager';

function userTree({ user, tree, setFile, reloadTree, isMobile, return2main, stack, setStack }) {
    const [localTree, setLocalTree] = useState(tree);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);

    // state pour highlight du dossier
    const [dragOverFolderUuid, setDragOverFolderUuid] = useState(null);

    const handleDragStart = (e, node) => {
        const payload = JSON.stringify({
            uuid: node.Uuid || node.uuid,
            name: node.Name || node.name
        });
        try {
            e.dataTransfer.setData("application/json", payload);
            e.dataTransfer.setData("text/plain", payload); // fallback
            e.dataTransfer.effectAllowed = "move";
        } catch (err) {
            console.warn("dataTransfer setData failed", err);
        }
    };

    const handleDragEnd = (e) => {
        setDragOverFolderUuid(null);
    };

    const handleFolderDragEnter = (e, folderNode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderUuid(folderNode?.Uuid || folderNode?.uuid);
    };

    const handleFolderDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
    };

    const handleFolderDragLeave = (e, folderNode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderUuid(prev => {
            const id = folderNode?.Uuid || folderNode?.uuid;
            return prev === id ? null : prev;
        });
    };

    const handleFolderDrop = async (e, folderNode) => {
        e.preventDefault();
        // pas de closest ici : on utilise directement le node passé par le render
        if (!folderNode) return;

        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (!raw) return;
        let payload;
        try { payload = JSON.parse(raw); } catch { return; }

        const fileUuid = payload.uuid;
        const fileName = payload.name;
        if (!fileUuid || !fileName) return;

        const targetUuid = folderNode?.Uuid || folderNode?.uuid || null;

        // API call pour déplacer
        try {
            const res = await fetch(`/api/files/${fileUuid}/${encodeURIComponent(fileName)}/move`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetFolderUuid: targetUuid })
            });

            if (!res.ok) {
                const js = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
                toast("error", js?.message || "Erreur déplacement fichier");
                return;
            }

            await reloadTree();
        } catch (err) {
            console.error(err);
            toast("error", "Erreur réseau lors du déplacement");
        } finally {
            setDragOverFolderUuid(null);
        }
    };

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

    // order: folders first then files
    const sortChildren = (children) => {
        const childList = children.slice(); // copy

        // extraire ../ s'il existe
        const upNodeIndex = childList.findIndex(c => c._isRoot || c._isUp);
        let upNode = null;
        if (upNodeIndex !== -1) {
            upNode = childList.splice(upNodeIndex, 1)[0];
        }

        childList.sort((a, b) => {
            const ta = getNodeType(a) === "folder" ? 0 : 1;
            const tb = getNodeType(b) === "folder" ? 0 : 1;
            if (ta !== tb) return ta - tb;
            const na = getNodeName(a).toLowerCase();
            const nb = getNodeName(b).toLowerCase();
            return na.localeCompare(nb);
        });

        // remettre ../ en premier
        if (upNode) childList.unshift(upNode);

        return childList;
    };

    // navigation actions
    const enterFolder = (folderNode) => {
        // push the folder object onto the stack
        setStack(prev => [...prev, folderNode]);
    };

    const goUp = () => {
        setDragOverFolderUuid(null);
        setStack(prev => {
            if (prev.length === 0) return prev;
            return prev.slice(0, prev.length - 1);
        });
    };

    const goRoot = async () => {
        try {
            const res = await fetch("/api/files/tree");
            if (!res.ok) throw new Error("Erreur réseau");
            const initialTree = await res.json();
            setStack([]);
            setLocalTree(initialTree);
        } catch (err) {
            toast("error", "Impossible de récupérer le tree initial");
            console.error(err);
        }
    };

    // Add folder (POST)
    const handleAddFolder = async (currentRoot) => {
        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;

        const parentUuid = currentRoot?.uuid || "";


        try {
            const res = await fetch("/api/folders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    ParentFolderUuid: parentUuid
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
                const target = findNodeByUuid(newTree, current?.Uuid || current?.uuid);
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
            <div
                key={key}
                className="file clickable-tree"
                style={{ paddingLeft: depth > 0 ? "0px" : "20px" }}
                onClick={() => displayFilePage(node, setFile)}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
            >
                <FontAwesomeIcon icon={icon} /> {displayName}
            </div>
        );
    };

    const handleTreeDragOverCapture = (e) => {
        const folderEl = e.target.closest(".folder, .root-link");
        if (!folderEl) return;
        // autorise le drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const uuid = folderEl.dataset.folderUuid;
        // utile pour debug / UI highlight
        // console.log("tree dragover on folder", uuid, e.target);
        setDragOverFolderUuid(uuid);
    };

    const handleTreeDropCapture = async (e) => {
        const folderEl = e.target.closest(".folder, .root-link");
        
        if (!folderEl) return;
        e.preventDefault();

        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (!raw) {
            console.warn("drop: no payload");
            return;
        }

        let payload;
        try { payload = JSON.parse(raw); } catch (err) {
            console.warn("drop: invalid payload", err);
            return;
        }

        const fileUuid = payload.uuid;
        const fileName = payload.name;
        const targetFolderUuid = folderEl.dataset.folderUuid;

        if (!fileUuid || !fileName || !targetFolderUuid) return;

        try {
            const res = await fetch(`/api/files/${fileUuid}/${encodeURIComponent(fileName)}/move`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetFolderUuid })
            });

            if (!res.ok) {
                const js = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
                toast("error", js?.message || "Erreur déplacement fichier");
                return;
            }

            await reloadTree();
        } catch (err) {
            console.error("drop error", err);
            toast("error", "Erreur réseau lors du déplacement");
        } finally {
            setDragOverFolderUuid(null);
        }
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
                _isTopLevel: true,
                Uuid: getUuid(rootNode)
            }));
        } else {
            // Remap current to the instance inside localTree when possible (stack entries may be old refs)
            const current = stack[stack.length - 1];
            const currentUuid = current?.Uuid || current?.uuid || null;
            const currentInTree = currentUuid ? findNodeByUuid(baseTree, currentUuid) : current;
            const children = sortChildren(getChildren(currentInTree || current));


            let parentUuid = null;
            if (stack.length >= 2) {
                parentUuid = getUuid(stack[stack.length - 2]) || null;
            } else {
                // try direct parent fields then search the baseTree for a parent that contains current
                parentUuid = currentInTree?.ParentFolderUuid || currentInTree?.ParentUuid || null;
                if (!parentUuid && currentUuid) {
                    // search baseTree for parent containing this node
                    parentUuid = findParentUuid(baseTree, currentUuid);
                }
            }

            const upNode = { _isUp: true, type: "up", name: "../", targetUuid: parentUuid };

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
            const targetUuid = node.targetUuid || null;

            // create a minimal folder-like object to pass to your existing handlers
            const minimalFolderNode = targetUuid ? { Uuid: targetUuid, uuid: targetUuid } : null;

            const isDragOver = dragOverFolderUuid === targetUuid && targetUuid !== null;

            return (
                <div
                    key={`up-${idx}`}
                    className={`folder root-link clickable-tree ${isDragOver ? 'drag-over' : ''}`}
                    style={{ paddingLeft: "20px" }}
                    onClick={goUp}
                    // make droppable only if we have a parentUuid
                    data-folder-uuid={targetUuid || ""}
                    onDragEnter={targetUuid ? (e) => handleFolderDragEnter(e, minimalFolderNode) : undefined}
                    onDragOver={targetUuid ? (e) => handleFolderDragOver(e, minimalFolderNode) : undefined}
                    onDragLeave={targetUuid ? (e) => handleFolderDragLeave(e, minimalFolderNode) : undefined}
                    onDrop={targetUuid ? (e) => handleFolderDrop(e, minimalFolderNode) : undefined}
                >
                    <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                </div>
            );
        }

        if (node._isRoot) {
            return (
                <div
                    key={`up-${idx}`}
                    className={`folder root-link clickable-tree`}
                    onClick={goRoot}
                >
                    <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                </div>
            );
        }

        if (node._isParentHeader) {
            const original = node._original;
            return (
                <div key={`header-${idx}`} className="clickable-tree folder-tree" style={{ paddingLeft: depth > 0 ? "20px" : "0px", fontWeight: "bold" }}>
                    <FontAwesomeIcon icon={faFolderOpen} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                    {!original.isTag && original.name !== "Shared" && original.name !== "Avatars" && (
                        <FontAwesomeIcon
                            icon={faFolderPlus}
                            style={{ float: "right", paddingTop: "5px", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleAddFolder(original); }}
                        />
                    )}
                    {!original.isTag && original.name !== "Avatars" && original.name !== "Shared" && (
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
                <div key={headerKey} className="folder" data-folder-uuid={node?.Uuid || node?.uuid}>
                    <div className="clickable-tree folder-tree">
                        <FontAwesomeIcon icon={faFolderOpen} style={{ color: "var(--login-button-hover)" }} /> {node.name}
                        {node._isTopLevel && node._original.name !== "Shared" && !node._original.isTag && (
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
            const folderUuid = getUuid(node) || ""; // string (ou "")
            const isDragOver = dragOverFolderUuid === folderUuid;

            return (
                <div
                    key={key}
                    className="folder"
                    data-folder-uuid={folderUuid || undefined} // undefined si vide -> pas d'attribut
                >
                    <div
                        className={`clickable-tree folder-tree ${isDragOver ? 'drag-over' : ''}`}
                        style={{ paddingLeft: depth > 0 ? "0px" : "20px" }}
                        onClick={() => enterFolder(node)}
                        onDragEnter={(e) => folderUuid && handleFolderDragEnter(e, node)}
                        onDragOver={(e) => folderUuid && handleFolderDragOver(e, node)}
                        onDragLeave={(e) => folderUuid && handleFolderDragLeave(e, node)}
                        onDrop={(e) => folderUuid && handleFolderDrop(e, node)}
                    >
                        <FontAwesomeIcon icon={faFolder} style={{ color: "var(--login-button-hover)" }} />{" "}
                        <span style={{ cursor: "pointer" }}>{getNodeName(node)}</span>
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

    useEffect(() => {
        const container = document.querySelector(".left-box");
        const cb = (e) => {
            e.preventDefault();
        };
        container.addEventListener("dragover", cb, true); // true = capture
        return () => container.removeEventListener("dragover", cb, true);
    }, []);

    return (
        <div className="left-box">
            <div
                onDragOverCapture={handleTreeDragOverCapture}
                onDropCapture={handleTreeDropCapture}
                onDragLeaveCapture={() => setDragOverFolderUuid(null)}
            >
                {currentItems.map((item, idx) => renderViewItem(item, idx, 0))}
            </div>
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
