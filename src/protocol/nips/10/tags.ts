const hex = /^[0-9a-f]{64}$/;
/** Marked threads preferred; positional tags supported only for ordinary discussion. */
export function readThread(tags: string[][]): { rootId: string | null; parentId: string | null } {
    const references = tags.filter(tag => tag[0] === 'e');
    if (references.some(tag => !hex.test(tag[1] ?? ''))) throw new Error('Invalid event reference.');
    const roots = references.filter(tag => tag[3] === 'root');
    const replies = references.filter(tag => tag[3] === 'reply');
    if (roots.length > 1 || replies.length > 1) throw new Error('Ambiguous thread references.');
    if (roots.length) return { rootId: roots[0][1], parentId: replies[0]?.[1] ?? roots[0][1] };
    if (replies.length) throw new Error('A marked reply needs a root reference.');
    const positional = references.filter(tag => !tag[3]);
    return { rootId: positional[0]?.[1] ?? null, parentId: positional.at(-1)?.[1] ?? null };
}
export function stateThread(rootId: string, author: string, relayHint = ''): string[][] {
    if (!hex.test(rootId) || !hex.test(author)) throw new Error('Invalid thread identity.');
    if (relayHint && !/^wss:\/\//.test(relayHint)) throw new Error('Use a secure relay hint.');
    return [['e', rootId, relayHint, 'root', author], ['p', author]];
}
