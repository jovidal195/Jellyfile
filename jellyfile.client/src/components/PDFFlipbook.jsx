import { useEffect, useState, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import "./PDFFlipbook.css"
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

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [pageRatio, setPageRatio] = useState(null); // largeur / hauteur

    const computeDimensions = (ratio) => {
        // 60 % de l'écran pour le LIVRE (= 2 pages)
        const maxBookWidth = window.innerWidth * 0.7;
        const maxBookHeight = window.innerHeight * 0.7;

        // largeur max d'une page = moitié de la largeur du livre
        let pageWidth = maxBookWidth / 2;
        let pageHeight = pageWidth / ratio;

        if (pageHeight > maxBookHeight) {
            pageHeight = maxBookHeight;
            pageWidth = pageHeight * ratio;
        }

        return { width: pageWidth, height: pageHeight };
    };

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

                let ratio = pageRatio;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2 });

                    // On prend le ratio sur la première page
                    if (i === 1) {
                        ratio = viewport.width / viewport.height;
                        setPageRatio(ratio);
                        setDimensions(computeDimensions(ratio));
                    }

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
    }, [fileUrl]);

    useEffect(() => {
        if (!pageRatio) return;

        const handleResize = () => {
            setDimensions(computeDimensions(pageRatio));
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // init

        return () => window.removeEventListener("resize", handleResize);
    }, [pageRatio]);

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
        <div className="pdf-flipbook-container" >
            <HTMLFlipBook
                className="pdf-flipbook"
                width={dimensions.width}
                height={dimensions.height}
                minWidth={100}
                maxWidth={dimensions.width}
                maxHeight={dimensions.height}
                showCover={true}
                usePortrait={false} // à revoir par rapport aux métadonnées
                ref={flipBookRef}
                onFlip={handleFlip}
            >
                {pages.map((page, idx) => (
                    <div className="pdf-page"  key={idx} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                        <img src={page} alt={`Page ${idx + 1}`} />
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
