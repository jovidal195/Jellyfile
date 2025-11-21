import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import './FileViewer.css';

function ExternalPreviewPage() {
    const { uuid, fileName } = useParams();
    const [searchParams] = useSearchParams();
    const pin = searchParams.get("pin");
    const [fileUrl, setFileUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!pin) {
            setError("PIN manquant");
            return;
        }

        const fetchFile = async () => {
            const res = await fetch(`/api/files/${uuid}/${fileName}?pin=${pin}`);
            if (!res.ok) {
                setError("Impossible de récupérer le fichier");
                return;
            }

            // Pour un fichier binaire, on peut créer une URL blob
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setFileUrl(url);
        };

        fetchFile();
    }, [uuid, fileName, pin]);

    const backHome = () => {
        window.location.href = `/`;
    }

    if (error) {
        return (
            <div className="file-controller">
                <h2 style={{ color: "red" }}>{error}</h2>
                <button onClick={backHome}>Retour à l'accueil</button>
            </div>
        )
    }
    if (!fileUrl) return <p>Chargement...</p>;

    return (
        <div className="file-controller">
            <h2>Fichier : {fileName}</h2>
            <button
                onClick={() => {
                    const link = document.createElement("a");
                    link.href = fileUrl;
                    link.download = fileName;
                    link.click();
                }}
            >
                Télécharger le fichier
            </button>
        </div>
    );
}

export default ExternalPreviewPage;