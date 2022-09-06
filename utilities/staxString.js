

const charWidths = { "a": 6, "b": 7, "c": 7, "d": 7, "e": 7, "f": 5, "g": 7, "h": 6, "i": 2, "j": 5, "k": 6, "l": 1, "m": 11, "n": 6, "o": 7, "p": 7, "q": 7, "r": 4, "s": 6, "t": 5, "u": 6, "v": 7, "w": 11, "x": 6, "y": 8, "z": 6, "A": 9, "B": 8, "C": 8, "D": 9, "E": 7, "F": 7, "G": 9, "H": 8, "I": 2, "J": 6, "K": 8, "L": 6, "M": 9, "N": 8, "O": 10, "P": 7, "Q": 10, "R": 7, "S": 7, "T": 7, "U": 8, "V": 9, "W": 13, "X": 8, "Y": 8, "Z": 8, "0": 8, "1": 3, "2": 7, "3": 7, "4": 8, "5": 7, "6": 7, "7": 7, "8": 7, "9": 7, "!": 1, '"': 4, "#": 8, "$": 7, "%": 10, "&": 8, "'": 2, "(": 3, ")": 3, "*": 5, "+": 6, ",": 2, "-": 4, ".": 2, "/": 6, ":": 2, ";": 2, "<": 6, "=": 6, ">": 6, "?": 6, "@": 12, "[": 3, "\\": 6, "]": 3, "^": 5, "_": 6, "`": 4, "{": 4, "|": 2, "}": 4 }


/*
    Helper functions to assist in Stax word-data operations (such as highlighting).
*/


export const getStringWidth = (fullString) => {

    // Calculate width of all chars
    let width = 0;
    for (let i = 0; i < fullString.length; i++)
        width += charWidths[fullString[i]];

    return width;

}

export const getStringCutIdx = (string, stringX, stringWidth, cursorX) => {

    /*
    NOTE ON COORD SYSTEMS: 

    Inputs: 
        Both the word and the cursor just need to be input in the same space. This is usually "pageSpace". (i.e. 0-1 w.r.t TL corner).
    

    Computations: 
        All computations are happening in "normalized space".

        This is a space where stringWidthPx = 1.0. 

        Therefore, all input coordinates are first convered into a frame where stringWidthPx = 1.0. 
        All character widths are convered into a frame where stringWidthPx = 1.0.

    */

    // Locate cursor w.r.t the word
    const cursorXWithinWord = cursorX - stringX;

    const scale_realToNorm = 1 / stringWidth;
    const scale_normToReal = 1 / scale_realToNorm;
    const scale_charToNorm = 1 / getStringWidth(string);

    // Convert cursor to normalized space
    const cursor_normSpace = cursorXWithinWord * scale_realToNorm;

    // Let's figure out where our cursor lies, snapped to the nearest char in normalized space
    let runningW = 0;
    for (let i=0; i<string.length; i++) {

        const letterW = charWidths[string[i]];
        const letterW_normSpace = letterW * scale_charToNorm;

        // If our cursor lies BEFORE the center of the letter...
        if (cursor_normSpace < (runningW + letterW_normSpace / 2)) {

            // We haven't reached this yet!
            return {
                cutIdx: i,
                snappedCursorX: stringX + (runningW * scale_normToReal),
            };

        }

        runningW += letterW_normSpace;

    }

    return {
        cutIdx: string.length,
        snappedCursorX: stringX + stringWidth,
    };


}