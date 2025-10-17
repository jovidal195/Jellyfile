export function bindEnterForVisible(menuSelector, callback) {
    const handler = (e) => {
        const menu = document.querySelector(menuSelector);
        // Si menu existe ET est visible
        if (!menu || menu.style.display === "none") return;

        if (e.key === "Enter") {
            e.preventDefault();
            callback();
        }
    };

    window.addEventListener("keydown", handler);

    // Retourne une fonction pour détacher complètement le listener si besoin
    return () => window.removeEventListener("keydown", handler);
}