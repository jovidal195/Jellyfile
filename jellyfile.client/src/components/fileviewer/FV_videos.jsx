import AsyncCreatableSelect from 'react-select/async-creatable';
import ToggleSwitch from "../ToggleSwitch";
import "./FV_visual.css";

function VideoViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    updateMetadata,
    LANGUAGE_OPTIONS,
    filterLanguages,
    languageValue,
    setLanguageValue,
    subtitleValue,
    setSubtitleValue,
    savedFields
}) {
    return (
        <>
            <video
                key={file.uuid}
                controls
                style={{
                    maxWidth: "80%",
                    maxHeight: "60vh",
                    objectFit: "contain"
                }}
            >
                <source
                    src={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`}
                    type="video/mp4"
                />
                Ton navigateur ne supporte pas la lecture vidéo.
            </video>

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

                <div className="line-container">
                    <label>Langue</label>
                    <AsyncCreatableSelect
                        isClearable
                        cacheOptions
                        defaultOptions={LANGUAGE_OPTIONS}
                        loadOptions={async (inputValue) => filterLanguages(inputValue)}
                        value={languageValue}
                        onChange={(opt) => {
                            if (opt === null) {
                                setLanguageValue(null);
                                updateMetadata({ language: null });
                                return;
                            }
                            setLanguageValue(opt);
                            updateMetadata({ language: opt.value });
                        }}
                        onCreateOption={(inputValue) => {
                            const custom = { value: inputValue, label: inputValue };
                            setLanguageValue(custom);
                            updateMetadata({ language: inputValue });
                        }}
                        placeholder="Sélectionnez ou entrez une langue..."
                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div className="line-container">
                    <label>Sous-titres</label>
                    <AsyncCreatableSelect
                        isClearable
                        cacheOptions
                        defaultOptions={LANGUAGE_OPTIONS}
                        loadOptions={async (inputValue) => filterLanguages(inputValue)}
                        value={subtitleValue}
                        onChange={(opt) => {
                            if (opt === null) {
                                setSubtitleValue(null);
                                updateMetadata({ subtitleLanguage: null });
                                return;
                            }
                            setSubtitleValue(opt);
                            updateMetadata({ subtitleLanguage: opt.value });
                        }}
                        onCreateOption={(inputValue) => {
                            const custom = { value: inputValue, label: inputValue };
                            setSubtitleValue(custom);
                            updateMetadata({ subtitleLanguage: inputValue });
                        }}
                        placeholder="Sélectionnez ou entrez la langue des sous-titres..."
                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div className="line-container">
                    <label>Version</label>
                    <input
                        type="text"
                        defaultValue={file.metadata?.version || ""}
                        onBlur={async e => updateMetadata({ version: e.target.value }, "version")}
                    />
                    <span className={`saved-check ${savedFields.version ? "visible" : ""}`}>
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
            </form>
        </>
    );
}

export default VideoViewer;