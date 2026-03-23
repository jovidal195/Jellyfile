import AsyncCreatableSelect from 'react-select/async-creatable';
import { useState } from "react";

function ScriptViewer({
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

    const SCRIPT_LANGUAGES = [
        // Scripts populaires
        { value: "Python", label: "Python" },
        { value: "JavaScript", label: "JavaScript" },
        { value: "TypeScript", label: "TypeScript" },
        { value: "Bash", label: "Bash / Shell" },
        { value: "PowerShell", label: "PowerShell" },
        { value: "PHP", label: "PHP" },
        { value: "Ruby", label: "Ruby" },
        { value: "Perl", label: "Perl" },
        { value: "Lua", label: "Lua" },
        { value: "R", label: "R" },
        { value: "Julia", label: "Julia" },
        { value: "Tcl", label: "Tcl" },
        { value: "VBScript", label: "VBScript / VBA" },
        { value: "Groovy", label: "Groovy" },
        { value: "Scheme", label: "Scheme / Lisp" },
        { value: "Elixir", label: "Elixir / Erlang" },
        { value: "OCaml", label: "OCaml" },
        { value: "Haskell", label: "Haskell" },
        { value: "F#", label: "F#" },

        // Langages compilés majeurs
        { value: "C", label: "C" },
        { value: "C++", label: "C++" },
        { value: "C#", label: "C#" },
        { value: "Java", label: "Java" },
        { value: "Kotlin", label: "Kotlin" },
        { value: "Go", label: "Go" },
        { value: "Rust", label: "Rust" },
        { value: "Swift", label: "Swift" },
        { value: "D", label: "D" },
        { value: "Nim", label: "Nim" },
        { value: "Crystal", label: "Crystal" },
        { value: "Zig", label: "Zig" },

        // Langages académiques / niche / historiques
        { value: "Ada", label: "Ada" },
        { value: "Fortran", label: "Fortran" },
        { value: "COBOL", label: "COBOL" },
        { value: "Prolog", label: "Prolog" },
        { value: "Smalltalk", label: "Smalltalk" },
        { value: "Eiffel", label: "Eiffel" },
        { value: "Algol", label: "Algol" },
        { value: "Racket", label: "Racket" },
        { value: "Common Lisp", label: "Common Lisp" },
        { value: "VHDL", label: "VHDL" },
        { value: "Verilog", label: "Verilog" },
        { value: "MATLAB", label: "MATLAB / Octave" },
        { value: "SAS", label: "SAS" },
        { value: "ABAP", label: "ABAP" },
        { value: "Elm", label: "Elm" },
        { value: "ReasonML", label: "ReasonML / ReScript" },
        { value: "Hack", label: "Hack (Facebook)" },
        { value: "Dart", label: "Dart" }
    ];

    const filterOptions = (input) => {
        const q = (input || "").toLowerCase();
        if (!q) return SCRIPT_LANGUAGES;
        return SCRIPT_LANGUAGES.filter(o =>
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
                    <label>Langage</label>
                    <AsyncCreatableSelect
                        isClearable
                        cacheOptions
                        defaultOptions={SCRIPT_LANGUAGES}
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
                        placeholder="Sélectionnez un langage..."
                        styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div className="line-container">
                    <label>Version</label>
                    <input
                        type="text"
                        value={file.metadata?.version || ""}
                        onChange={async e => updateMetadata({ version: e.target.value })}
                    />
                </div>
            </form>
        </>
    );
}

export default ScriptViewer;