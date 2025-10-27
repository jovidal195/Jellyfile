export function bindEnterForVisible(menuSelector, callback) {
    const handler = (e) => {
        const menu = document.querySelector(menuSelector);
        if (!menu) return;

        const style = window.getComputedStyle(menu);
        const isHidden = style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
        if (isHidden) return;

        if (e.key === "Enter") {
            e.preventDefault();
            callback();
        }
    };

    window.addEventListener("keydown", handler);

    // Retourne une fonction pour détacher complètement le listener si besoin
    return () => window.removeEventListener("keydown", handler);
}