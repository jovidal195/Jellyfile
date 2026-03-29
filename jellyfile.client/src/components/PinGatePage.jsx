import { useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import './FileViewer.css';
import { getDeviceFingerprint } from "../utils/deviceFingerprint";

function PinGatePage() {
    const navigate = useNavigate();
    const { uuid, accesstoken, fileName } = useParams();
    const [pin, setPin] = useState("");
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(false);

    async function submit() {
        const fp = await getDeviceFingerprint();
        /*console.log(fp);
        console.log(JSON.stringify({ pin, accessToken: accesstoken, fingerprint: fp }));*/

        const res = await fetch(`/api/files/pin/validate/${uuid}/${fileName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin, accessToken: accesstoken, fingerprint: fp }),
        });

        if (!res.ok) {
            setError("PIN invalide");
            setShake(true);

            setTimeout(() => {
                setShake(false);
                setError(null);
            }, 2000);
            return;
        }

        const data = await res.json();

        if (data.authenticated) {
            navigate("/", { state: { fileToDisplay: data.file } });
        } else {
            console.log(data);
            navigate(`/external-preview/${uuid}/${accesstoken}/${fileName}?pin=${pin}`);
        }
    }

    return (
        <div className={`file-controller ${shake ? "shake" : ""}`}>
            <h2>Accès protégé</h2>
            <i>saisissez votre PIN</i>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <p><input type="number" value={pin} onChange={(e) => setPin(e.target.value)} style={{ padding: "8px", fontSize: "1.2em", width: "50vw", maxWidth: "300px"}} /></p>
            <button onClick={submit}>Valider</button>
        </div>
    );
}

export default PinGatePage;