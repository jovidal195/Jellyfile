export const findNodeByUuid = (nodes, uuid) => {
    if (!nodes || !uuid) return null;
    for (const n of nodes) {
        if (getUuid(n) === uuid) return n;
        const children = n.Files || n.files || [];
        const found = findNodeByUuid(children, uuid);
        if (found) return found;
    }
    return null;
};

export const findParentUuid = (nodes, childUuid) => {
    if (!Array.isArray(nodes) || !childUuid) return null;
    for (const n of nodes) {
        const children = getChildren(n) || [];
        for (const c of children) {
            if (getUuid(c) === childUuid) return getUuid(n) || null;
        }
        const deeper = findParentUuid(children, childUuid);
        if (deeper) return deeper;
    }
    return null;
};

// helpers (place-les au top du composant userTree)
export const getUuid = (n) => n?.Uuid || n?.uuid || n?.Id || null;
export const getNodeType = (n) => (n?.type || n?.Type || (n?.IsFolder || n?.isFolder ? "folder" : (n?.Files || n?.files ? "folder" : "file"))).toString().toLowerCase();
export const getNodeName = (n) => n?.name || n?.Name || n?.Name || "";
export const getChildren = (n) => n?.Files || n?.files || [];

export const defineNode = (tree, uuid) => {
    return findNodeByUuid(tree, uuid);
}

export const updateNodeMetadata = (setTree, uuid, changes) => {
    const deepUpdate = (nodes) => {
        return nodes.map(n => {
            if (getUuid(n) === uuid) {
                return {
                    ...n,
                    metadata: {
                        ...(n.metadata || {}),
                        ...changes
                    }
                };
            }

            const children = getChildren(n);
            if (children && children.length > 0) {
                return {
                    ...n,
                    Files: deepUpdate(children)
                };
            }

            return n;
        });
    };

    setTree(prevTree => deepUpdate(prevTree));
};