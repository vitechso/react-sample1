/* eslint-disable no-unused-vars */
import React, { useState, useRef } from 'react';
import SimpleScrollbars from './Tools/SimpleScrollbars';

import '../styles/documentViewer.css';


// Time to wait before considering a scroll completed.
const SCROLL_END_LOAD_LAG = 500;

// Timers
let scrollTimer = null;
let pageCountTimer = null;

export default React.forwardRef((props, ref) => {
  /*
        Helper component to handle dynamically loading the content of a srollable component.
    */

  // ------ STATE ------

  // Show cur page counter
  const [currentPage, setCurrentPage] = useState(0);
  const [showPageCount, setShowPageCount] = useState(false);
  const mounted = useRef(false);

  // Component Did Mount
  React.useEffect(() => {
    mounted.current = true;

    // Unmount
    return () => {
      // Set flag
      mounted.current = false;

      // Release timers
      if (scrollTimer) clearTimeout(scrollTimer);
      if (pageCountTimer) clearTimeout(pageCountTimer);
    };
  }, []);

  const onScrollEnd = async () => {
    // Get the page we're on
    const page = await props.getCurrentPage();

    // Lets figure out what pages we need
    const startPageIdx = Math.max(
      0,
      Math.floor(page - props.loadingWindow / 2)
    );
    const endPageIdx = Math.min(
      props.totalPages,
      Math.ceil(page + props.loadingWindow / 2)
    );

    // Ask parent to load the pages!
    props.loadPageRange(startPageIdx, endPageIdx);
  };

  const onDocScroll = async e => {
    // Get the current page
    const page = await props.getCurrentPage();

    // Store page, and show counter
    setCurrentPage(page);
    setShowPageCount(true);

    // Don't forget to hide the page counter later!
    if (pageCountTimer) clearTimeout(pageCountTimer);
    pageCountTimer = setTimeout(() => {
      setShowPageCount(false);
    }, 2000);

    // Dynamic load timer
    if (!props.staticLoad) {
      // Clear
      if (scrollTimer) clearTimeout(scrollTimer);

      // Set
      scrollTimer = setTimeout(onScrollEnd, SCROLL_END_LOAD_LAG);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <SimpleScrollbars
        renderTrackVertical={props => (
          <div className="scrollbar-track-v" {...props} />
        )}
        renderTrackHorizontal={props => (
          <div className="scrollbar-track-h" {...props} />
        )}
        renderThumbVertical={props => (
          <div className="scrollbar-thumb-v" {...props} />
        )}
        renderThumbHorizontal={props => (
          <div className="scrollbar-thumb-h" {...props} />
        )}
        onScroll={onDocScroll}
        ref={ref}
      >
        {/* Render children (pages, etc.) */}
        {props.children}
      </SimpleScrollbars>

      {/* Page Counter */}
      <div
        className={
          "document-page-counter" +
          (!showPageCount ? " document-page-counter-hidden" : "")
        }
      >
        Page {currentPage + 1} of {props.totalPages}
      </div>
    </div>
  );
});
