/* eslint-disable */
import React, { useRef, useState } from "react";
import Loading from "react-loading";

import staxDocUtils from "../utilities/staxDoc";

import "../styles/documentViewer.css";
import generateKey from "../../UniqueKey";

// Constants
const DEFAULT_ASPECT_RATIO = 11 / 8.5;

const HighlightedWords = (props) => {
  // We need a pageRef!
  if (!props.pageRef || !props.pageRef.current) return <></>;

  // Page bounds
  const staxPageBounds = props.pageRef.current.getBoundingClientRect();

  return (
    <div>
      {props.words.map((word, idx) => {
        return (
          <div
            key={idx + generateKey()}
            className="document-selection"
            style={{
              left: staxPageBounds.width * word.x - props.padX / 2 + "px",
              top: staxPageBounds.height * word.y - props.padY / 2 + "px",
              width: staxPageBounds.width * word.width + props.padX + "px",
              height: staxPageBounds.height * word.height + props.padY + "px",
            }}
            onMouseUp={props.onMouseUp}
            onMouseDown={props.onMouseDown}
            onMouseMove={props.onMouseMove}
          />
        );
      })}
    </div>
  );
};

const StaxPage = (props) => {
  // ------ REFS ------

  const pageRef = useRef(null);

  // ------ STATE ------

  const [textHovered, setTextHovered] = useState(false);
  const [mouseDown, setMouseDown] = useState(false);

  // Set Cursor Vis
  const updateCursor = (e) => {
    const { x, y } = staxDocUtils.windowCoordsToDivCoords(pageRef, {
      x: e.pageX,
      y: e.pageY,
    });

    if (!x || !y) return;

    // Are we over a word?
    const wordIdx = staxDocUtils.getWordAtCursor(x, y, props.words, true);

    if (wordIdx === null) return setTextHovered(false);

    const word = props.words[wordIdx];
    if (!word) return setTextHovered(false);

    setTextHovered(true);
  };

  const highlightDoubleClick = (e) => {
    e.preventDefault();

    // Get pageCoords
    const { x, y } = staxDocUtils.windowCoordsToDivCoords(pageRef, {
      x: e.pageX,
      y: e.pageY,
    });
    if (!x || !y) return;

    // Over a word?
    const wordIdx = staxDocUtils.getWordAtCursor(x, y, props.words, true);
    if (wordIdx === null) return;

    // Select word
    props.setSelected([
      {
        ...props.words[wordIdx],
        wordIdx,
      },
    ]);
  };

  const initSelectionStart = (x, y) => {
    // Initialize the selection action by setting the start loc!
    const wordIdx = staxDocUtils.getWordAtCursor(x, y, props.words, false);

    if (wordIdx === null) return;

    props.setSelectionStart({
      idx: wordIdx,
      offsetX: 0,
    });
  };

  const highlightCursorMove = (e) => {
    if (!mouseDown) return;

    e.preventDefault();

    // Get pageCoords
    const { x, y } = staxDocUtils.windowCoordsToDivCoords(pageRef, {
      x: e.pageX,
      y: e.pageY,
    });
    if (!x || !y) return;

    // Selection start needed?
    if (props.selectionStart === null) {
      initSelectionStart(x, y);
      return;
    }

    // Get updated selected words
    const curSelected = staxDocUtils.getHighlightedWords(
      props.selectionStart.idx,
      { x, y },
      props.words
    );
    props.setSelected(curSelected);
  };

  const startHighlight = (e) => {
    // Clear prev selection
    props.setSelected([]);
    setMouseDown(true);
  };

  const resetHighlightAction = (e) => {
    setMouseDown(false);
    props.setSelectionStart(null);
  };

  const getPageHeight = () => {
    /*
            NOTE: 
            
            This one function is linked to the CSS of the document-page. 

            If the width of document-page / document-page -> img are changed in the CSS, this should be updated. 

            This function multiplies that width by an aspect ratio, so all that should need to change is the 
                "(78vh - 60px)" 
            ... terms below. 

        */

    // Get aspect ratio
    let aspectRatio = props.aspectRatio
      ? props.aspectRatio
      : DEFAULT_ASPECT_RATIO;

    // Flag for rotated pages (dims will need to be handled)
    const rotatedSideways =
      props.rotation && [90, 270, -90].includes(props.rotation);

    if (rotatedSideways) {
      // If we had to rotate the document...
      // Update the wrapper height to fit the new width!
      // Can't be done auto, since CSS doesn't get internal transform data in the parent. And we're rotating the internal image.

      // The image's HEIGHT will by lying length-wise...
      // So we need to find the analagous width, to make this div that tall.

      // The Horizontal Image's height will be : (78vh - 60px) based on css.
      // So this needs to be the "Correlated Width" tall.

      return "calc(" + 1 / aspectRatio + " * (78vh - 60px))";
    }

    // If we're not rotated sideways... we'll still need to set a manual height if the document hasn't loaded in!
    else if (!props.pageSrc || props.pageSrc === "tmp")
      return "calc(" + aspectRatio + " * (78vh - 60px))";

    // Otherwise... we'll just let the page shape to it's image div content!
    return "auto";
  };

  // Empty page?
  if (!props.pageSrc) {
    return (
      <div
        className={
          "document-page" +
          (props.rotation
            ? " document-page-rotate-" + String(props.rotation)
            : "")
        }
        ref={props.setPageRef}
        style={{
          // Height (may need manual setting if img not loaded, or if img rotated with css internally)
          height: getPageHeight(),

          // Cursor render
          cursor: textHovered ? "text" : "auto",
        }}
      ></div>
    );
  }

  return (
    <div
      className={
        "document-page" +
        (props.rotation
          ? " document-page-rotate-" + String(props.rotation)
          : "")
      }
      ref={props.setPageRef}
      style={{
        // Height needs manual setting if img not loaded.
        height: getPageHeight(),

        // Cursor render
        cursor: textHovered ? "text" : "auto",
      }}
    >
      {/* Page Image */}
      {props.pageSrc &&
      typeof props.pageSrc === "string" &&
      props.pageSrc !== "tmp" ? (
        <img
          ref={pageRef}
          src={props.pageSrc}
          alt={"Page " + props.pageIdx}
          // Actions
          onMouseMove={(e) => {
            updateCursor(e);
            highlightCursorMove(e);
          }}
          onDoubleClick={highlightDoubleClick}
          onMouseDown={startHighlight}
          onMouseUp={resetHighlightAction}
          draggable={false}
        />
      ) : (
        <div
          ref={pageRef}
          style={{}}
          className="document-loader-container"
          title="Loading page..."
          draggable={false}
        >
          <div className="document-loader">
            <Loading type="bubbles" color="black" height={80} width={80} />
            Loading...
          </div>
        </div>
      )}

      {/* Selected Words */}
      {props.selected && props.selected.length > 0 && (
        <HighlightedWords
          words={props.selected}
          pageRef={pageRef}
          padX={2}
          padY={4}
          onMouseUp={(e) => {
            resetHighlightAction(e);
          }}
          onMouseDown={(e) => {
            resetHighlightAction(e);
          }}
          onMouseMove={(e) => {
            highlightCursorMove(e);
          }}
        />
      )}
    </div>
  );
};

export default StaxPage;
