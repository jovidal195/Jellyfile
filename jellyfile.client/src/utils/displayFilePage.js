export function displayFilePage(f, setFile) {
    const rightBox = document.querySelector(".right-box");

    rightBox.querySelectorAll(":scope > div").forEach(div => {
        div.style.display = "none";
    });

    const fileViewer = document.querySelector(".file-viewer");
    fileViewer.style.display = "initial";

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        const leftBox = document.querySelector(".left-box");
        leftBox.style.display = "none";
    }
    
    
    setFile(f);
    //console.log(f);
};