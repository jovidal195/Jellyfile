import AsyncCreatableSelect from 'react-select/async-creatable';
import ToggleSwitch from "../ToggleSwitch";

function AudioViewer({
    file,
    tags,
    updateMetadata,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    savedFields
}) {
    return (
        <>
            <audio
                key={file.hash}
                controls
                style={{ width: "80%" }}
            >
                <source
                    src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                    type="audio/mpeg"
                />
                Ton navigateur ne supporte pas la lecture audio.
            </audio>

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
                    <label>Auteur/Artiste</label>
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
                    <label>Album</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.collections || ""}
                        onBlur={async e => updateMetadata({ collections: e.target.value }, "collections")}
                    />
                    <span className={`saved-check ${savedFields.collections ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <label>Genre</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.type || ""}
                        onBlur={async e => updateMetadata({ type: e.target.value }, "type")}
                    />
                    <span className={`saved-check ${savedFields.type ? "visible" : ""}`}>
                        ✓
                    </span>
                </div>

                <div className="line-container">
                    <span>
                        <label>Date de création</label>
                        <input
                            type="date"
                            value={file.metadata?.creationDate?.split("T")[0] || ""}
                            onChange={async e => updateMetadata({ creationDate: e.target.value })}
                        />
                    </span>
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

                <div>
                    <label>Généré par IA</label>
                    <ToggleSwitch
                        checked={file.metadata?.isAiGenerated}
                        onChange={async val => updateMetadata({ isAiGenerated: val })}
                    />
                </div>
            </form>
        </>
    );
}

export default AudioViewer;