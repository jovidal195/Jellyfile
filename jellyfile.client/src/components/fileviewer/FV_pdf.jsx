import AsyncCreatableSelect from 'react-select/async-creatable';
import PDFFlipbook from "../PDFFlipbook";

function PdfViewer({
    file,
    tags,
    selectedTags,
    setSelectedTags,
    syncFileTags
}) {
    return (
        <>
            <PDFFlipbook fileUrl={`/api/files/${file.uuid}/${file.name}?t=${Date.now()}`} />

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
                    <input type="text" />
                </div>

                <div className="line-container">
                    <label>Editeur</label>
                    <input type="text" />
                </div>

                <div className="line-container">
                    <span>
                        <label>Date de publication</label>
                        <input type="date" />
                    </span>
                </div>

                <div className="line-container">
                    <label>Copyright</label>
                    <input type="text" />
                </div>
            </form>
        </>
    );
}

export default PdfViewer;