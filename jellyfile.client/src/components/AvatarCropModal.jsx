import Cropper from "react-easy-crop";
import { getCroppedImg } from "../utils/cropImage.js";
import { useState } from "react";

export default function AvatarCropModal({ file, onConfirm, onCancel }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        const croppedBlob = await getCroppedImg(file, croppedAreaPixels);
        onConfirm(croppedBlob);
    };

    return (
        <div>
            <div style={{ position: "relative", width: "300px", height: "300px", background: "#333" }}>
                <Cropper
                    image={URL.createObjectURL(file)}
                    crop={crop}
                    zoom={zoom}
                    aspect={1} // carré
                    cropShape="rect" // on garde carré pour pouvoir arrondir avec CSS
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    minZoom={1}            // empêche de réduire trop
                    maxZoom={3}            // permet zoomer jusqu’à 3x
                />
            </div>
            <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: "100%", marginTop: "10px" }}
            />

            <div style={{ marginTop: "10px" }}>
                <button onClick={onCancel}>Annuler</button>
                <button onClick={handleConfirm}>Confirmer</button>
            </div>
        </div>
    );
}
