import AsyncCreatableSelect from 'react-select/async-creatable';
import ToggleSwitch from "../ToggleSwitch";

function AudioViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags
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
                    <input type="text" />
                </div>

                <div className="line-container">
                    <label>Album</label>
                    <input type="text" />
                </div>

                <div className="line-container">
                    <label>Genre</label>
                    <input type="text" />
                </div>

                <div className="line-container">
                    <span>
                        <label>Date de création</label>
                        <input type="date" />
                    </span>
                </div>

                <div className="line-container">
                    <label>Copyright</label>
                    <input type="text" />
                </div>

                <div>
                    <label>Généré par IA</label>
                    <ToggleSwitch
                        checked={false}
                        onChange={async val => { console.log(val); }}
                    />
                </div>
            </form>
        </>
    );
}

export default AudioViewer;