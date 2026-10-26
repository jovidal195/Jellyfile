import AsyncCreatableSelect from 'react-select/async-creatable';
import ToggleSwitch from "../ToggleSwitch";
import "./FV_visual.css";
function ImageViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    updateMetadata,
    setAvatar,
    savedFields 
}) {
    return (
        <>
            {file.isAvatar ? (
                <div>
                    <button
                        style={{ padding: "7px", fontSize: "0.85em", margin: "5px" }}
                        onClick={() => setAvatar(file)}
                    >
                        activer l'avatar
                    </button>
                </div>
            ) : null}

            <img
                key={file.hash}
                src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                alt={file.name}
            />

            <AsyncCreatableSelect
                isMulti
                defaultOptions={tags.map(t => ({ value: t.name, label: t.name }))}
                value={selectedTags.map(t => ({ value: t.name, label: t.name }))}
                className="tags-select"
                classNamePrefix="tags-select"
                placeholder="Ajouter des tags..."
                loadOptions={async (inputValue) => {
                    if (!inputValue) {
                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                        return tags
                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                            .map(t => ({ value: t.name, label: t.name }));
                    }

                    try {
                        const r = await fetch(`/api/files/tags/search?query=${encodeURIComponent(inputValue)}`, { credentials: "include" });
                        if (!r.ok) return [];
                        const data = await r.json();
                        const existingNames = new Set(selectedTags.map(t => t.name.toLowerCase()));
                        return data
                            .filter(t => !existingNames.has(t.name.toLowerCase()))
                            .map(t => ({ value: t.name, label: t.name }));
                    } catch {
                        return [];
                    }
                }}
                onChange={async (values) => {
                    const unique = Array.from(new Set(values.map(v => v.value)))
                        .map(name => ({ name }));
                    setSelectedTags(unique);
                    await syncFileTags(unique);
                }}
            />

            <form>
                <div className="line-container">
                    <label>Auteur</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.author || ""}
                        onBlur={async e => updateMetadata({ author: e.target.value }, "author")}
                    />
                    <span className={`saved-check ${savedFields.author ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Date de création</label>
                    <input
                        type="date"
                        value={file.metadata?.creationDate?.split("T")[0] || ""}
                        onChange={async e => updateMetadata({ creationDate: e.target.value })}
                    />
                </div>

                <div className="line-container">
                    <label>Copyright</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.copyrightHolder || ""}
                        onBlur={async e => updateMetadata({ copyrightHolder: e.target.value }, "copyrightHolder")}
                    />
                    <span className={`saved-check ${savedFields.copyrightHolder ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Licence</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.license || ""}
                        onBlur={async e => updateMetadata({ license: e.target.value }, "license")}
                    />
                    <span className={`saved-check ${savedFields.license ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                    <label>Généré par IA</label>
                    <ToggleSwitch
                        checked={file.metadata?.isAiGenerated}
                        onChange={async val => updateMetadata({ isAiGenerated: val })}
                    />
                </div>

                <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                    <label>Vectoriel</label>
                    <ToggleSwitch
                        checked={file.metadata?.isVector}
                        onChange={async val => updateMetadata({ isVector: val })}
                    />
                </div>

                <div className="line-container">
                    <label>Format</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.format || ""}
                        onBlur={async e => updateMetadata({ format: e.target.value }, "format")}
                    />
                    <span className={`saved-check ${savedFields.format ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Color Mode</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.colorMode || ""}
                        onBlur={async e => updateMetadata({ colorMode: e.target.value }, "colorMode")}
                    />
                    <span className={`saved-check ${savedFields.colorMode ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>DPI</label>
                    <input
                        type="number"
                        defaultValue={file.metadata?.dpi || ""}
                        onBlur={async e => updateMetadata({ dpi: parseInt(e.target.value) }, "dpi")}
                    />
                    <span className={`saved-check ${savedFields.dpi ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Bit Depth</label>
                    <input
                        type="number"
                        defaultValue={file.metadata?.bitDepth || ""}
                        onBlur={async e => updateMetadata({ bitDepth: parseInt(e.target.value) }, "bitDepth")}
                    />
                    <span className={`saved-check ${savedFields.bitDepth ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Collections</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.collections || ""}
                        onBlur={async e => updateMetadata({ collections: e.target.value }, "collections")}
                    />
                    <span className={`saved-check ${savedFields.collections ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>
            </form>
        </>
    );
}

export default ImageViewer;