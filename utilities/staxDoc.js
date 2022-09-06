
import { getStringCutIdx } from './staxString';

// Constants
const WORD_DATA_SIZE = 42;


// ------ DOCUMENT WORD HELPERS ------


export const loadDocWordsBuffer = async (wordsBuffer) => {

    // Init vars
    const words = [];
    let cursor = 0;

    while (cursor+WORD_DATA_SIZE < wordsBuffer.length) {

        // Word meta
        const meta = wordsBuffer.slice(cursor, cursor + WORD_DATA_SIZE);
        const size = meta.readUInt16LE(WORD_DATA_SIZE-2);
        const text = wordsBuffer.slice(cursor + WORD_DATA_SIZE, cursor + WORD_DATA_SIZE + size);

        // Get word 
        words.push({
            x: meta.readFloatLE(0),
            y: meta.readFloatLE(4),
            width: meta.readFloatLE(8),
            height: meta.readFloatLE(12),
            angle: meta.readFloatLE(16),
            page: meta.readUInt16LE(28),
            group: meta.readUInt16LE(30),
            line: meta.readUInt16LE(32),
            word: meta.readUInt16LE(34),
            class: meta.readUInt16LE(36),
            text: text.toString()
        });

        // Move cursor
        cursor += WORD_DATA_SIZE + size;

    }

    return words;


}

export const initializeDocWordRotations = async (inputWords, doc) => {
    
    // Rotate words on each page to match the doc!
    let words = [...inputWords];

    // No page rotations? 
    if (!doc || !doc.rotations)
        return words;

    // For each page...
    for (let pageIdx of Object.keys(doc.rotations)) {

        // Rotation targets
        const targetRot = doc.rotations[pageIdx];
        const currentRot = 0;       // Just loaded in!

        // Update words
        words = await rotateDocumentPageWords(words, pageIdx, targetRot, currentRot);

    }

    return words;

}

export const rotateDocumentPageWords = (inputWords, pageIdx, targetRot, currentRot) => {

    if (!inputWords)
        return inputWords;

    let words = [...inputWords];

    // Figure out turns needed
    const turns = Math.round((targetRot - currentRot) / 90) % 4;

    for (const [ wordIdx, word ] of words.entries()) {

        // eslint-disable-next-line
        if (word.page != pageIdx)
            continue;

        const angle = ((word.angle ? word.angle : 0) - targetRot);

        const x = word.x;
        const y = word.y;
        const w = word.width;
        const h = word.height;

        if (turns === 3 || turns === -1) { // 90 deg counterclockwise
            words[wordIdx].x = y;
            words[wordIdx].y = 1 - x - w;
            words[wordIdx].width = h;
            words[wordIdx].height = w;
        }

        else if (turns === 2 || turns === -2) { // 180 deg clockwise
            words[wordIdx].x = 1 - x - w;
            words[wordIdx].y = 1 - y - h;
        }

        else if (turns === 1 || turns === -3) { // 90 deg clockwise
            words[wordIdx].x = 1 - y - h;
            words[wordIdx].y = x;
            words[wordIdx].width = h;
            words[wordIdx].height = w;
        }

        // Dont change angle during init
        words[wordIdx].angle = angle;
    }

    return words;

}




// ------ DOCUMENT LOCATION OPTIONS ------

export const windowCoordsToDivCoords = (domRef, point) => {

    // Val Check
    if (!point.x || !point.y || !domRef || !domRef.current)
        return {x: 0, y: 0};

    // Object Rectangle
    const objRect = domRef.current.getBoundingClientRect();

    return {
        x: (point.x - objRect.x) / objRect.width,
        y: (point.y - objRect.y) / objRect.height
    };

}


const cursorInlineWithWord = (x, y, word) => {

    if ((y > word.y) && (y < word.y + word.height)) 
        return true;

    return false;

}

const cursorInWord = (x, y, word) => {

    if ((Math.abs(y - word.y) < word.height) && (x > word.x) && (x < word.width + word.x) )
        return true;

    return false;

}

export const getWordAtCursor = (x, y, words, restrictive = false) => {
    /*
    Get the word at the relevant x/y location. 

    Params: 

    restrictive [bool] : If true, we'll only return the word if the point is exactly in it. 
                        Otherwise, we'll try to return the nearest word on another line. 

    */

    if (!words || words.length === 0)
        return null


    // Track the idx of the first word on the line after the cursor, incase needed.
    let firstIdxOfNextLine = null;

    // Same for the last word on the line the cursor is on. 
    let lastInlineWordPreCursor = null;

    let lastInlineWord = null;


    // List of words the cursor is within
    const wordsHovered = [];

    // For each word...
    for (const [idx, word] of words.entries()) {

        // Inline w/ cursor? 
        if (cursorInlineWithWord(x, y, word)) {

            // Cursor in word? 
            if (cursorInWord(x, y, word)) {
                wordsHovered.push(idx);
                continue;
            }

            // Catalog as last inline so-far
            else if (x < word.x && lastInlineWordPreCursor === null) {
                lastInlineWordPreCursor = Math.max(0, (idx-1));
            }

            // Catalog last in line period, if we're off to the side.
            else if (x > word.x)
                lastInlineWord = idx;

        }

        // We've hit a line beyond the cursor

        // Catalog if needed. 
        else if (!restrictive && (y < (word.y)) && firstIdxOfNextLine === null) {
            firstIdxOfNextLine = Math.max(0, Math.min(idx, words.length));
        }


    }

    // Single word? Return!
    if (wordsHovered.length === 1)
        return wordsHovered[0];

    // If we're in multiple... 
    if (wordsHovered.length > 1) {
        let smallestWordIdx;
        let smallestWordHeight;
        for (const idx of wordsHovered) {
            const word = words[idx];
            if (!smallestWordHeight || word.height < smallestWordHeight) {
                smallestWordHeight = word.height;
                smallestWordIdx = idx;
            }
        }
        return smallestWordIdx;
    }

    // ... if we got here, we couldn't find anything. 
    if (restrictive)
        return null;

    else {

        // Last inline before cursor? 
        if (lastInlineWordPreCursor !== null) {
            return lastInlineWordPreCursor;
        }

        // Last inline period? 
        if (lastInlineWord !== null) {
            return lastInlineWord;
        }

        // First word on upcoming line? 
        if (firstIdxOfNextLine !== null)
            return firstIdxOfNextLine;

        // The cursor is after everything!
        return (words.length - 1);

    }

}

export const clipWordWithCursors = (inputWord, cursor1 = null, cursor2 = null) => {
    /*
    Helper function to get a clipped version of word data, based on a cursor's location (usually when cursor is within the word).

    */

    // Data check
    if (!inputWord.text)
        return null;

    // Copy
    let word = {...inputWord};


    // Out of range? 
    if ( (cursor1 && cursor1.x < word.x) ||
         (cursor2 && cursor2.x > (word.x + word.width))    
    ) {

        // Empty the text
        word.text = '';
        
        // Zero the width 
        word.width = 0;

        return word;

    }


    // Assume the cursors are at the start and end unless dictated. 
    let cursor1Data = {
        cutIdx: 0,
        cursorLoc: word.x,
    };
    let cursor2Data = {
        cutIdx: word.text.length,
        cursorLoc: (word.x + word.width),
    };


    // Cursor 1 needed? 
    if (cursor1) {

        // Get the cut index!
        const cutData = getStringCutIdx(word.text, word.x, word.width, cursor1.x);

        cursor1Data = {
            cutIdx: cutData.cutIdx, 
            cursorLoc: cutData.snappedCursorX
        };



    }

    // Cursor 2 needed? 
    if (cursor2) {

        // Get the cut index!
        const cutData = getStringCutIdx(word.text, word.x, word.width, cursor2.x);

        cursor2Data = {
            cutIdx: cutData.cutIdx,
            cursorLoc: cutData.snappedCursorX
        };

    }


    // Figure out which cursor is leading!
    let leadingCursor, endingCursor;
    
    if (cursor2Data.cutIdx < cursor1Data.cutIdx) {
        leadingCursor = cursor2Data;
        endingCursor = cursor1Data;
    }
    else {
        leadingCursor = cursor1Data;
        endingCursor = cursor2Data;
    }


    // Clip the word as needed!
    word.x = leadingCursor.cursorLoc;
    word.width = endingCursor.cursorLoc - leadingCursor.cursorLoc;
    word.text = word.text.substring(leadingCursor.cutIdx, endingCursor.cutIdx);


    return word;


}


export const getHighlightedWords = (startWordIdx, cursor, words) => {


    // Get the word the cursor is over
    const cursorWordIdx = getWordAtCursor(cursor.x, cursor.y, words, false);

    if (!words[cursorWordIdx])
        return [];

    // Init selected
    let selected = [];


    // Case : forward highlight
    if (startWordIdx <= cursorWordIdx) {

        // For each word between....
        for (let i=startWordIdx; i<=cursorWordIdx; i++) {

            // Get the cursors for this word. 
            let cursor1 = null;
            let cursor2 = null;

            // Start needed? 
            if (i === startWordIdx)
                cursor1 = {x: words[startWordIdx].x, y: words[startWordIdx].y};

            // End cursor needed?
            if (i === cursorWordIdx)
                cursor2 = cursor;

            // Cut word if needed
            if (cursor1 || cursor2) {

                const cutWord = clipWordWithCursors(words[i], cursor1, cursor2);
                selected.push(cutWord);
                
            }
            else {
                selected.push({...words[i]});
            }

        }

    }

    // Case : reverse highlight
    else {

        for (let i = startWordIdx; i >= cursorWordIdx; i--) {

            // Get the cursors for this word. 
            let cursor1 = null;
            let cursor2 = null;

            // Start needed? 
            if (i === startWordIdx)
                cursor2 = { x: words[startWordIdx].x, y: words[startWordIdx].y };

            // End cursor needed?
            if (i === cursorWordIdx)
                cursor1 = cursor;

            // Cut word if needed
            if (cursor1 || cursor2) {
                const cutWord = clipWordWithCursors(words[i], cursor1, cursor2);
                selected.unshift(cutWord);
            }
            else {
                selected.unshift({ ...words[i] });
            }

        }

    }

    return selected;

}

const mainExport =  {
    getHighlightedWords,
    getWordAtCursor,
    windowCoordsToDivCoords,
};

export default mainExport;


