

/*
    Helper function for listing Stax directory contents

*/

const staxListDir = (all, dir) => {

    if (!all)
        return [];

    // Show only stacks after this location
    const stacks = all.map(s => Object.assign({}, s))
        .filter(s => s.path.substring(0, dir.length) === dir)
        .map(s => ({
            ...s,
            relativePath: s.path.substring(dir.length > 0 ? dir.length + 1 : 0)
        }));

    // Don't show stacks that are at the next level
    let tmp = [];
    for (const stack of stacks) {
        if (stack.relativePath.length === 0) // Parent
            continue;

        const pathCmp = stack.relativePath.split("/");
        if (pathCmp.length === 1) { // Node
            tmp.push(stack);
            continue;
        }

        // Group - create a "pseudo"-stack/group node if it doesn't already exist
        const pathRoot = pathCmp[0];
        let group = stacks.find(s => s.relativePath === pathRoot);

        // If a group node (or fake group node) exists, add meta to it
        if (group) {
            group.numDocuments += stack.numDocuments;
            group.numUnread += stack.numUnread;
            continue;
        }

        // Design change - NO FAKE STACKS ALLOWED.
        tmp.push(stack);
    }

    return tmp;

}

export default staxListDir;