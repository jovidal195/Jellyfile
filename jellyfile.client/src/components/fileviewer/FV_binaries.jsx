import AsyncCreatableSelect from 'react-select/async-creatable';
import { useState } from "react";

function BinaryViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags,
    updateMetadata
}) {

    const [typeValue, setTypeValue] = useState(
        file?.metadata?.subtitleLanguage ? { value: file.metadata.subtitleLanguage, label: file.metadata.subtitleLanguage } : null
    );

    const TYPES_OPTIONS = [
        "Executable",
        "Library",
        "Firmware",
        "Driver",
        "Package",
        "Database",
        "Configuration",
        "Executable Script / Bytecode",
        "Resource File",
        "Document (binary)",
        "Other"
    ].map(t => ({ value: t, label: t }));

    const filterOptions = (input) => {
        const q = (input || "").toLowerCase();
        if (!q) return TYPES_OPTIONS;
        return TYPES_OPTIONS.filter(o =>
            o.label.toLowerCase().includes(q)
        );
    };

    return (
        <>
            <p>Type de fichier non pris en charge</p>

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

                <div className="line-container">
                    <label>Type de binaire</label>
                    <AsyncCreatableSelect
                        isClearable
                        cacheOptions
                        defaultOptions={TYPES_OPTIONS}
                        loadOptions={async (inputValue) => filterOptions(inputValue)}
                        value={typeValue}
                        onChange={(opt) => {
                            if (opt === null) {
                                setTypeValue(null);
                                updateMetadata({ subtitleLanguage: null });
                                return;
                            }
                            setTypeValue(opt);
                            updateMetadata({ subtitleLanguage: opt.value });
                        }}
                        onCreateOption={(inputValue) => {
                            const custom = { value: inputValue, label: inputValue };
                            setTypeValue(custom);
                            updateMetadata({ subtitleLanguage: inputValue });
                        }}
                        placeholder="Sélectionnez le type de binaire..."
                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>
            </form>
        </>
    );
}

export default BinaryViewer;