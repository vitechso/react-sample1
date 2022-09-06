/* eslint-disable */
import React, { useRef, useState } from "react";

// Components
import DynamicPageScroller from "./DynamicPageScroller";
import StaxPage from "./StaxPage";

// Utilities
import usePrevious from "../utilities/previousState";
import {
  loadDocWordsBuffer,
  initializeDocWordRotations
} from "../utilities/staxDoc";
import { copyText } from "../utilities/copy";

// Styles
import "../styles/documentViewer.css";
import { toast } from "react-toastify";

// Constants
const DEFAULT_ASPECT_RATIO = 11 / 8.5;
const PAGE_LOAD_WINDOW = 10;

const DocumentViewer = props => {
  // ------ API Cancel Token ------

  const [cancelToken] = useState(new AbortController());

  // ------ REFS ------
  const documentScroller = useRef(null);
  const pageRefs = useRef({});
  const viewerModal = useRef(null);
  const mountedRef = useRef(false);

  // ------ State ------

  // Props cache
  const prevDocId = usePrevious(props.document._id);

  // Page data
  const [aspectRatios, setAspectRatios] = useState([]);
  const [localPages, setLocalPages] = useState({});

  // Selection data
  const [selected, setSelected] = useState([]);
  const [selectionStart, setSelectionStart] = useState(null);

  // Helper state to force refs to refresh
  const [forceReRenderCounter, setForceReRender] = useState(0);

  // Force refresh refs
  const forceRefreshRefs = () => {
    setForceReRender(counter => {
      return counter + 1;
    });
  };

  // On force rerender
  React.useEffect(() => {
    // No direct action needed
  }, [forceReRenderCounter]);

  // Component Did Mount
  React.useEffect(() => {
    // Note mounted
    mountedRef.current = true;

    // Refresh the pageRefs
    pageRefs.current = {};
    forceRefreshRefs();

    // Prevent main document scroll
    const scrollY =
      document.documentElement.style.getPropertyValue("--scroll-y");
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}`;

    // Unmount
    return () => {
      // Clear page images
      clearLocalPages();

      // Set unmounted
      mountedRef.current = false;
      cancelToken.abort();

      // Re-allow main document scroll
      const body = document.body;
      const scrollY = body.style.top;
      body.style.position = "";
      body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shortcut handlers
  const onKeyPress = e => {
    // Copy
    if (e.key === "c" && e.ctrlKey) {
      copySelectedText();
    }
  };

  // Doc Id Change
  React.useEffect(() => {
    // Ensure new docId
    if (prevDocId === props.document._id) return;

    // Refresh all data!
    onNewDocument();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.document._id]);

  // Page images update: Update Refs
  React.useEffect(() => {
    // Refresh the pageRefs
    pageRefs.current = {};
  }, [localPages.length]);

  const copySelectedText = () => {
    if (!selected || selected.length <= 0) return;

    // Copy
    const selectionText =
      selected.map(wordData => wordData.text).join(" ") + "\n";
    copyText(selectionText);

    // Toast info
    toast.info("Copied to clipboard");
  };

  const refreshDocumentWords = async doc => {
    /*
            Refresh the document words based on the words downloadable URL.
        */

    const docId = doc._id;

    if (doc.wordsUrl) {
      // Fetch
      const res = await props.downloadBlob(
        doc.wordsUrl,
        false,
        { signal: cancelToken.signal },
        true
      );
      const buffer = new Buffer(await res.arrayBuffer());

      // Read buffer
      let words = await loadDocWordsBuffer(buffer);

      // Rotate words as needed by the document!
      words = await initializeDocWordRotations(words, doc);

      // Sort the words out by page
      const sortedWords = {};
      for (let i = 0; i < doc.pages.length; i++) {
        const pageWords = words.filter(w => w.page === i);
        sortedWords[i] = pageWords;
      }

      // Make sure we didn't unmount while we were operating!
      if (!mountedRef.current) return;

      // Set words!
      props.updateLocalDoc(docId, {
        words: sortedWords
      });
    }
  };

  const refreshDocumentAspects = doc => {
    // Default aspect ratios
    let curRatios = [];
    for (let i = 0; i < doc.pages.length; i++)
      curRatios.push(DEFAULT_ASPECT_RATIO);

    // Apply page ratios where available
    if (doc.aspects) {
      for (const [k, v] of Object.entries(doc.aspects)) {
        let key = Number(k);
        if (!isNaN(key)) {
          curRatios[key] = v;
        }
      }
    }

    // Set aspect ratios
    setAspectRatios(curRatios);
  };

  const clearLocalPages = async () => {
    // Remove images
    for (let imgUrl of Object.values(localPages))
      window.URL.revokeObjectURL(imgUrl);

    // Clear state
    setLocalPages({});
  };

  const getSafePageIdxRange = (startPage, numPages) => {
    // Get upper cap
    const endCap = Math.min(startPage + numPages, props.document.pages.length);

    // Create list
    let pageIdxs = [];
    for (let i = startPage; i < endCap; i++) {
      pageIdxs.push(i);
    }

    return pageIdxs;
  };

  const loadPages = async pageIdxs => {
    // Load all page Idx's (in parallel, but wait for all)
    await Promise.all(
      pageIdxs.map(async pageIdx => {
        // Out of range?
        if (pageIdx < 0 || pageIdx >= props.document.pages.length) return null;

        // Already loaded?
        if (typeof localPages[pageIdx] === "string") return null;

        // Load page!
        return await loadPage(pageIdx, props.document.pages[pageIdx]);
      })
    );
  };

  const loadPage = async (pageIdx, pageKey) => {
    // Don't reload!
    if (localPages[pageIdx] !== undefined) return;

    if (!mountedRef.current) return;

    // Set placeholder
    setLocalPages(localPages => {
      return {
        ...localPages,
        [pageIdx]: "tmp"
      };
    });

    // Load page img
    const imgUrl = await loadPageImage(pageKey);

    // Safe to load in after time spent fetching?
    if (!imgUrl || !mountedRef.current) return;

    // Set page
    setLocalPages(localPages => {
      return {
        ...localPages,
        [pageIdx]: imgUrl
      };
    });
  };

  const loadPageImage = async pageKey => {
    // Download
    const data = await props.downloadBlob(
      pageKey,
      false,
      { signal: cancelToken.signal },
      true
    );
    if (!data) return null;

    // Create URL
    return window.URL.createObjectURL(new Blob([data], { type: "image/jpeg" }));
  };

  const onNewDocument = async () => {
    const doc = props.document;

    // Clear the current data if empty docs!
    if (!doc) {
      setAspectRatios([]);
      clearLocalPages();
      return;
    }

    // --- Background ---
    refreshDocumentAspects(doc);
    refreshDocumentWords(doc);

    // Now, we need to refresh the pages that are loaded in!
    if (doc.pages && doc.pages.length > 0) {
      // Clear any current page img data
      await clearLocalPages();

      // Load first pages
      loadPages(getSafePageIdxRange(0, PAGE_LOAD_WINDOW));
    }
  };

  const getCurrentPage = async () => {
    // Can't find refs?
    if (!viewerModal || !viewerModal.current) return null;

    // Modal bounds
    const viewerModalBounds = viewerModal.current.getBoundingClientRect();

    // NOTE: Since the Scolling is taking up the whole window... we don't need to worry about offsets from headers, other components, etc.

    let currentPage = 0;

    // Get all pages
    const allPages = props.document.pages.map((pageKey, pageIdx) => {
      return pageIdx;
    });

    for (let pageIdx of allPages) {
      // Get page ref
      const pageRef = pageRefs.current[pageIdx];
      if (!pageRef) return null;

      // Get loc
      const pageRect = pageRef.getBoundingClientRect();

      // Passed the current page?
      // if (this new page starts after the middle of the Modal)
      if (pageRect.y > viewerModalBounds.height / 2) return currentPage;

      // Set current page for now
      currentPage = parseInt(pageIdx);
    }

    return currentPage;
  };

  const loadPageRange = (startPageIdx, endPageIdx) => {
    // Load pages between a start and end index
    const pageIdxs = getSafePageIdxRange(
      startPageIdx,
      endPageIdx - startPageIdx
    );
    loadPages(pageIdxs);
  };

  // Visible pages
  // Render all pages, some will just not be loaded yet!
  const visiblePages = props.document.pages.map((pageKey, pageIdx) => {
    return pageIdx;
  });

  return (
    <div
      className="document-modal"
      onKeyDown={onKeyPress}
      tabIndex="0"
      ref={viewerModal}
    >
      {/* Shadow */}
      <div className="document-modal-shadow" />

      {/* Close button */}
      <div
        className="document-close"
        alt="x"
        title="Back to stack"
        onClick={props.exitDocument}
      >
        <i className="material-icons">close</i>
      </div>

      <DynamicPageScroller
        ref={documentScroller}
        totalPages={props.document.pages.length}
        currentPages={Object.keys(localPages).length}
        loadingWindow={PAGE_LOAD_WINDOW}
        // Data access methods
        getCurrentPage={getCurrentPage}
        // Methods
        loadPageRange={loadPageRange}
      >
        {/* Visible Pages */}
        {visiblePages.map(pageIdx => {
          const words = props.document.words[pageIdx]
            ? props.document.words[pageIdx]
            : [];
          const filteredSelect = selected.filter(w => {
            return parseInt(w.page) === parseInt(pageIdx);
          });

          return (
            <StaxPage
              id={"doc-page" + pageIdx}
              key={pageIdx}
              pageIdx={pageIdx}
              pageSrc={localPages[pageIdx] ? localPages[pageIdx] : null}
              words={words}
              aspectRatio={aspectRatios[pageIdx]}
              setPageRef={p => {
                pageRefs.current[pageIdx] = p;
              }}
              rotation={
                props.document.rotations ? props.document.rotations[pageIdx] : 0
              }
              // Selection
              selected={filteredSelect}
              setSelected={setSelected}
              selectionStart={selectionStart}
              setSelectionStart={setSelectionStart}
            />
          );
        })}
      </DynamicPageScroller>
    </div>
  );
};

export default DocumentViewer;
