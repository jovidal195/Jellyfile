import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import './userTree.css';
import { displayFilePage } from "../utils/displayFilePage.js";

function userTree({ user, tree, setFile }) {
    const [openFolders, setOpenFolders] = useState({}); // key: folderKey, value: boolean

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



    const renderFolder = (folder, key, depth = 0) => {
        const folderKey = `${key}-${folder.name}`;
        const isOpen = openFolders[folderKey] ?? true;

        return (
            <div key={folderKey} className="folder">
                <div
                    className="clickable-tree folder-tree"
                    style={{ paddingLeft: depth > 0 ? "13px" : "0px" }}
                    onClick={() => toggleFolder(folderKey)}
                >
                    <FontAwesomeIcon icon={isOpen ? faFolderOpen : faFolder} /> {folder.name}
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