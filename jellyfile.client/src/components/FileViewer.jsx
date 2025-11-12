import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faFolder, faFolderOpen, faFile, faFileImage, faFileVideo, faFileAudio, faFilePdf, faFileArchive, faFileCode, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import PDFFlipbook from './PDFFlipbook';
import FontPreview from './FontPreview';
function FileViewer({ file, return2main }) {

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
                {file.fileTypeName === "Image" ? (
                    <img
                        key={file.hash}
                        src={`http://localhost:5291/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
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
                                src={`http://localhost:5291/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
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
                                    src={`http://localhost:5291/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                            type="audio/mpeg"
                        />
                        Ton navigateur ne supporte pas la lecture audio.
                    </audio>
                ) : file.fileTypeName === "Document" && file.name.endsWith(".pdf") ? (
                         <PDFFlipbook fileUrl={`http://localhost:5291/api/files/${file.uuid}/${file.name}?t=${Date.now()}`} />
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
        </div>
    
  );
}

export default FileViewer;