import { useEffect, useState, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { useToast } from "./ToastProvider";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAnglesLeft, faChevronLeft, faChevronRight, faAnglesRight} from '@fortawesome/free-solid-svg-icons';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PDFFlipbook({ fileUrl }) {
    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [gotoPageInput, setGotoPageInput] = useState("1");
    const toast = useToast();
    const flipBookRef = useRef(null);

    const [dimensions, setDimensions] = useState({
        width: window.innerWidth * 0.6,
        height: window.innerHeight * 0.6
    });

    const isMobile = window.innerWidth < 640;
    const buttonStyle = {
        fontSize: isMobile ? "1rem" : "1.5rem",
        padding: isMobile ? "0.3em 0.5em" : "0.5em 1em"
    };
    const inputStyle = {
        width: isMobile ? "35px" : "50px",
        height: isMobile ? "2em" : "3em",
        textAlign: "center",
        fontWeight: "bold",
        border: "1px solid #ccc",
        borderRadius: "4px"
    };

    const goToPage = (pageIndex) => {
        if (flipBookRef.current) {
            const physicalIndex = pageIndex; // pas besoin de -1 si showCover=false, sinon à ajuster
            flipBookRef.current.pageFlip().flip(physicalIndex);
        }
    };

    const nextPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipNext();
        }
    };

    const prevPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipPrev();
        }
    };

    const handleFlip = () => {
        if (flipBookRef.current) {
            const index = flipBookRef.current.pageFlip().getCurrentPageIndex();
            setCurrentPage(index + 1); // logique humaine
            setGotoPageInput((index + 1).toString());
        }
    };

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

    const handleGotoSubmit = (e) => {
        e.preventDefault();
        const pageNum = parseInt(gotoPageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages.length) {
            goToPage(pageNum - 1); // index physique
        } else {
            // Remet l'input à la page actuelle si invalide
            setGotoPageInput(currentPage.toString());
        }
    };

    if (pages.length === 0) return <p>Chargement du PDF...</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
            
            <HTMLFlipBook width={dimensions.width} height={dimensions.height} ref={flipBookRef} showCover={true} onFlip={handleFlip} >
                {pages.map((page, idx) => (
                    <div key={idx} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                        <img src={page} alt={`Page ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                ))}
            </HTMLFlipBook>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <button style={buttonStyle} title="Première Page" onClick={() => goToPage(0)}><FontAwesomeIcon icon={faAnglesLeft} /></button>
                <button style={buttonStyle} title="Page Précédente" onClick={prevPage}><FontAwesomeIcon icon={faChevronLeft} /></button>
                <form onSubmit={handleGotoSubmit}>
                    <input
                        type="number"
                        min="1"
                        max={pages.length}
                        value={gotoPageInput}
                        onChange={(e) => setGotoPageInput(e.target.value)}
                        style={inputStyle}
                    />
                </form>
                <span> / {pages.length}</span>
                <button style={buttonStyle} title="Page Suivante" onClick={nextPage}><FontAwesomeIcon icon={faChevronRight} /></button>
                <button style={buttonStyle} title="Dernière Page" onClick={() => goToPage(pages.length - 1)}><FontAwesomeIcon icon={faAnglesRight} /></button>
            </div>
        </div>
    );
}
