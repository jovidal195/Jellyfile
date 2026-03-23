export function displayFilePage(f, setFile) {
    const rightBox = document.querySelector(".right-box");

    rightBox.querySelectorAll(":scope > div").forEach(div => {
        div.style.display = "none";
    });

    const fileViewer = document.querySelector(".file-viewer");
    fileViewer.style.display = "initial";

    setFile(f);
    //console.log(f);
};