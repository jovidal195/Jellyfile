import { useEffect, useState, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { useToast } from "./ToastProvider";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PDFFlipbook({ fileUrl }) {
    const [pages, setPages] = useState([]);
    const toast = useToast();
    const flipBookRef = useRef(null);

    const [dimensions, setDimensions] = useState({
        width: window.innerWidth * 0.6,
        height: window.innerHeight * 0.6
    });

    useEffect(() => {
        const loadPdf = async () => {

            console.log(fileUrl);

            if (!fileUrl) {
                toast("error", "Aucune fichier reçu")
                setPages([]);
                return;
            }          

            if (fileUrl.includes("api/files/null")) {
                toast("error", "Fichier n'a pas de uuid")
                setPages([]);
                return;
            }

            try {
                const response = await fetch(fileUrl, { method: 'HEAD', credentials: "include" });
                if (!response.ok) {
                    toast("error", "Fichier introuvable sur le serveur");
                    setPages([]);
                    console.log(fileUrl);
                    console.log(response);
                    return;
                }

                const pdf = await pdfjsLib.getDocument({ url: fileUrl, withCredentials: true }).promise;
                const renderedPages = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2 });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport }).promise;
                    renderedPages.push(canvas.toDataURL());
                }

                setPages(renderedPages);
            } catch (err) {
                toast("error", "Impossible de charger le PDF")
                console.error("Impossible de charger le PDF :", err);
                setPages(null); // ou [] selon le fallback souhaité
            }
        };

        loadPdf();

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth * 0.6,
                height: window.innerHeight * 0.6
            });
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [fileUrl]);

    if (pages.length === 0) return <p>Chargement du PDF...</p>;

    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
            <HTMLFlipBook width={dimensions.width} height={dimensions.height} ref={flipBookRef} showCover={true}>
                {pages.map((page, idx) => (
                    <div key={idx} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                        <img src={page} alt={`Page ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                ))}
            </HTMLFlipBook>
        </div>
    );
}
