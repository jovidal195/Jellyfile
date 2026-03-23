import AsyncCreatableSelect from 'react-select/async-creatable';
import FontPreview from "../FontPreview";
import ToggleSwitch from "../ToggleSwitch";

function FontViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    updateMetadata
}) {
    return (
        <>
            <FontPreview file={file} />

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
                    <label>Monospaced ?</label>
                    <ToggleSwitch
                        checked={file.metadata?.isMonospaced}
                        onChange={async val => updateMetadata({ IsMonospaced: val })}
                    />
                </div>

                <div className="line-container" style={{ justifyContent: "space-between", marginRight: "20%" }}>
                    <label>Serif ?</label>
                    <ToggleSwitch
                        checked={file.metadata?.isSerif}
                        onChange={async val => updateMetadata({ IsSerif: val })}
                    />
                </div>
            </form>
        </>
    );
}

export default FontViewer;