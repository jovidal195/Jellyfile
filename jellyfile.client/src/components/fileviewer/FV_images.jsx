import AsyncCreatableSelect from 'react-select/async-creatable';
import ToggleSwitch from "../ToggleSwitch";

function ImageViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    updateMetadata,
    setAvatar
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
                        value={file.metadata?.author || ""}
                        onChange={async e => updateMetadata({ author: e.target.value })}
                    />
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
                        value={file.metadata?.copyrightHolder || ""}
                        onChange={async e => updateMetadata({ copyrightHolder: e.target.value })}
                    />
                </div>

                <div className="line-container">
                    <label>Licence</label>
                    <input
                        type="text"
                        value={file.metadata?.license || ""}
                        onChange={async e => updateMetadata({ license: e.target.value })}
                    />
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
                        value={file.metadata?.format || ""}
                        onChange={async e => updateMetadata({ format: e.target.value })}
                    />
                </div>

                <div className="line-container">
                    <label>Color Mode</label>
                    <input
                        type="text"
                        value={file.metadata?.colorMode || ""}
                        onChange={async e => updateMetadata({ colorMode: e.target.value })}
                    />
                </div>

                <div className="line-container">
                    <label>DPI</label>
                    <input
                        type="number"
                        value={file.metadata?.dpi || ""}
                        onChange={async e => updateMetadata({ dpi: parseInt(e.target.value) })}
                    />
                </div>

                <div className="line-container">
                    <label>Bit Depth</label>
                    <input
                        type="number"
                        value={file.metadata?.bitDepth || ""}
                        onChange={async e => updateMetadata({ bitDepth: parseInt(e.target.value) })}
                    />
                </div>

                <div className="line-container">
                    <label>Collections</label>
                    <input
                        type="text"
                        value={file.metadata?.collections || ""}
                        onChange={async e => updateMetadata({ collections: e.target.value })}
                    />
                </div>
            </form>
        </>
    );
}

export default ImageViewer;