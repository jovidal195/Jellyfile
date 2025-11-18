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

    const renderFiles = (files, parentKey) => {
        return files.map((f, idx) => {
            const displayName = f.name.length > 25
                ? f.name.slice(0, 22) + '...'
                : f.name;

            //console.log(f);

            const icon = fileTypeIcons[f.fileTypeName] || faFile;
            const uniqueKey = `${parentKey}-${f.name}-${idx}`;

            return (
                <div key={uniqueKey} className="file-item" style={{ paddingLeft: "10px" }} onClick={() => displayFilePage(f, setFile)    }>
                    <FontAwesomeIcon icon={icon} /> {displayName}
                </div>
            );
        });
    };

    const renderFolder = (folder, index) => {
        const folderKey = `${folder.name}-${index}`;
        const isOpen = openFolders[folderKey] ?? true;

        return (
            <div key={folderKey} className="folder">
                <div className="clickable-tree folder-tree" onClick={() => toggleFolder(folderKey)}>
                    <FontAwesomeIcon icon={isOpen ? faFolderOpen : faFolder} /> {folder.name}
                </div>
                {isOpen && folder.files && folder.files.length > 0 && (
                    <div className="clickable-tree file-tree">
                        {renderFiles(folder.files)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="left-box">
            {tree.map((folder, idx) => renderFolder(folder, idx))}
        </div>
    );
}

export default userTree;