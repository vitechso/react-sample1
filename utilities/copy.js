

/*
    Helper function to copy text to clipboard. 
*/

export const copyText = (text) => {
    if (!text || text.length === 0) return;

    // Clipboard API supported?
    if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(text);
    }

    else {
        const field = document.createElement('textarea');
        field.innerText = text;
        field.value = text;
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        document.body.removeChild(field);
    }
}