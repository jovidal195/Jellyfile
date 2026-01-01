import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { defineNode } from '../utils/nodesManager';
import { displayFilePage } from "../utils/displayFilePage.js";

export default function SearchBar({ tree, setFile, setTree }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ keywords: [], tags: [] });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }

        const timeout = setTimeout(() => {
            fetchResults(query);
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    const fetchResults = async (q) => {
        if (!q.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }

        try {
            const respTags = await fetch(
                `/api/files/tags/all-shared?query=${encodeURIComponent(q)}`,
                { credentials: "include" }
            );
            let tags = respTags.ok ? await respTags.json() : [];

            tags = tags.map(t => ({
                id: t.id,
                name: t.name,
                userId: t.userId ?? t.UserId ?? 0
            }));

            const respWord = await fetch(
                `/api/files/search/keyword?query=${encodeURIComponent(q)}`,
                { credentials: "include" }
            );
            let keywords = respWord.ok ? await respWord.json() : [];

            keywords = keywords.map(t => ({
                uuid: t.uuid,
                name: t.name
            }));

            setOpen(tags.length > 0 || keywords.length > 0);
            setResults({ keywords, tags });

        } catch (err) {
            console.error(err);
            setResults([]);
            setOpen(false);
        }
    };


    const searchTag = async (tag) => {
        console.log(`Le tag ${tag} a été choisi`);
        setOpen(false);

        try {
            const resp = await fetch(`/api/files/search/tags?query=${encodeURIComponent(tag)}`, {
                credentials: "include"
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ message: resp.statusText }));
                console.error("Erreur fetch tag tree:", err.message);
                return;
            }

            const treeResult = await resp.json();
            console.log("Tag tree reçu:", treeResult);

            // Exemple : mettre à jour le tree dans ton composant parent
            setTree(treeResult);

            // Si tu veux directement naviguer dans ce tag
            // setStack([treeResult[0]]); 
            // ou gérer comme tu veux
        } catch (err) {
            console.error("Erreur réseau fetch tag tree:", err);
        }
    };


    const searchFile = (uuid) => {
        const node = defineNode(tree, uuid);
        displayFilePage(node,setFile);
        setOpen(false);
    }

    return (
        <div className="search-container" style={{ position: "relative" }}>
            <input
                type="text"
                placeholder="Rechercher..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onClick={() => fetchResults(query)}
            />
            <button>
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: 'var(--interface-text)' }} />
            </button>
            {open && (results.tags.length > 0 || results.keywords.length > 0) && (
                <div className="search-dropdown">
                    <div style={{display:"flex"}}>
                        <div style={{ padding: "4px 8px", borderBottom: "1px solid #eee", flex: 4, minWidth: "150px" }}>
                            {results.keywords.map((k, i) => (
                                <div key={i} style={{ padding: "4px 8px", borderBottom: "1px solid #eee", flex: 1, display: "flex" }}>
                                    <div className="search-result" onClick={() => searchFile(k.uuid)}>{k.name}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: "4px 8px", borderBottom: "1px solid #eee", flex: 1, minWidth: 0 }}>
                            {results.tags.map((t, i) => (
                            <div key={i} style={{ padding: "4px 8px", borderBottom: "1px solid #eee", flex: 1, display : "flex"}}>
                                    <div className="tag search-result" onClick={() => searchTag(t.name)}>{t.name}</div>
                            </div>
                            ))}
                        </div>
                        <div style={{ padding: "4px 8px", borderBottom: "1px solid #eee", flex: 1, minWidth: 0 }}>test</div>
                    </div>
                </div>
            )}

        </div>

    );
}
