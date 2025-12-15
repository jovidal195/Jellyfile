export async function getDeviceFingerprint() {
    // Canvas fingerprint
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText("JellyfileFingerprint", 2, 2);
    const canvasHash = canvas.toDataURL();

    // Audio fingerprint
    let audioHash = "";
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const analyser = audioCtx.createAnalyser();
        oscillator.connect(analyser);
        analyser.connect(audioCtx.destination);
        oscillator.start(0);
        oscillator.stop(0);
        audioHash = audioCtx.sampleRate.toString();
    } catch { }

    // WebGL fingerprint
    const canvasWebGL = document.createElement("canvas");
    const gl = canvasWebGL.getContext("webgl") || canvasWebGL.getContext("experimental-webgl");
    let vendor = "", renderer = "", maxTexture = 0;
    if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
            vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
        maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }

    const fp = {
        platform: navigator.platform,
        architecture: navigator.userAgentData?.architecture || "",
        colorDepth: screen.colorDepth,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        canvas: canvasHash,
        audio: audioHash,
        webglVendor: vendor,
        webglRenderer: renderer,
        maxTexture,
        fonts: ["Arial", "Calibri", "Times New Roman", "Courier New"] // placeholder, tu peux détecter dynamiquement
    };

    const str = JSON.stringify(fp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
