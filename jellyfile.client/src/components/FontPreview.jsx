import React, { useEffect, useRef } from "react";
import opentype from "opentype.js";
import { useToast } from "./ToastProvider";

export default function FontPreview({
        file,
        marginRatio = 0.9,
        maxFontSize = 256,
        minFontSize = 8,
    }) {
    const canvasRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        if (!file) return;
        let cancelled = false;
        const canvas = canvasRef.current;
        if (!canvas) return;

        function resizeCanvas(clientW, clientH) {
            const dpr = window.devicePixelRatio || 1;
            canvas.style.width = clientW + "px";
            canvas.style.height = clientH + "px";
            canvas.width = Math.round(clientW * dpr);
            canvas.height = Math.round(clientH * dpr);
            return dpr;
        }

        const parentWidth = canvas.parentElement?.clientWidth || window.innerWidth;
        const clientWidth = parentWidth * 0.8;
        const clientHeight = 160; // fixed visual height; you can adapt
        const dpr = resizeCanvas(clientWidth, clientHeight);
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr); // scale drawing to DPR

        const url = `http://localhost:5291/api/files/${file.uuid}/${file.name}?t=${Date.now()}`;

        // Fetch the font with credentials (session)
        fetch(url, { credentials: "include" })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then(buffer => {
                if (cancelled) return;
                const font = opentype.parse(buffer);

                const fontFullName = font.names.fullName?.en || font.names.fontFamily?.en || file.name;

                const phrase = `Vous prévisualisez le font ${fontFullName}`;


                // utility: measure text width at a specific fontSize using opentype
                const measureWidth = (text, fSize) => {
                    return font.getAdvanceWidth(text, fSize);
                };

                // Binary search to find maximal fontSize so that textWidth <= canvasWidth * marginRatio
                const targetWidth = (clientWidth * marginRatio);
                let lo = minFontSize;
                let hi = Math.min(maxFontSize, clientWidth * 2); // upper bound
                let best = lo;

                for (let i = 0; i < 40; i++) { // enough iterations for precision
                    const mid = (lo + hi) / 2;
                    const w = measureWidth(phrase, mid);
                    if (w <= targetWidth) {
                        best = mid;
                        lo = mid;
                    } else {
                        hi = mid;
                    }
                }
                const fontSize = Math.round(best * 100) / 100; // tidy

                // compute ascent/descent scaled
                const scale = fontSize / font.unitsPerEm;
                const ascent = font.ascender * scale;
                const descent = Math.abs(font.descender * scale); // descend positive
                // baseline for vertical centering derived earlier:
                const baselineY = (clientHeight / 2) + (ascent - descent) / 2;

                // x position center
                const textWidth = measureWidth(phrase, fontSize);
                const x = (clientWidth - textWidth) / 2;
                const y = baselineY;

                // clear and draw
                ctx.clearRect(0, 0, clientWidth, clientHeight);
                ctx.save();
                ctx.fillStyle = "#000";

                // Draw with opentype path for best fidelity
                const path = font.getPath(phrase, x, y, fontSize);
                path.draw(ctx);

                ctx.restore();
            })
            .catch(err => {
                if (!cancelled) {
                    toast("error", "Impossible de charger la police")
                    console.error("Impossible de charger la police :", err);

                }
            });

        const onResize = () => {
            const clientW = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth * 0.8;
            resizeCanvas(clientW, clientHeight);
            const ctxClear = canvas.getContext("2d");
            ctxClear.clearRect(0, 0, canvas.width, canvas.height);
        };
        window.addEventListener("resize", onResize);

        return () => {
            cancelled = true;
            window.removeEventListener("resize", onResize);
        };
    }, [file, marginRatio, maxFontSize, minFontSize]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "80%", maxWidth: 1000, height: 160, display: "block", margin: "16px auto", border: "1px solid #eee" }}
        />
    );
}
