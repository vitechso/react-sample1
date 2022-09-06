/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { useLocation, withRouter } from "react-router-dom";
import axios from "axios";

// Styles
import "../styles/stackBrowser.css";

// Components
import DocumentViewer from "./DocumentViewer";
import StackViewer, { StackHeader, StackSearch } from "./StackViewer";

// Utils
import listdir from "../utilities/staxListdir";
import usePrevious from "../utilities/previousState";
import useURLQuery from "../utilities/useURLQuery";

import {
  DOC_FETCH_BATCH_SIZE,
  DOC_URL_PARAM,
  STACK_URL_PARAM,
} from "../constants";
import StaxSearchResults from "./StaxSearchResults";
import { toast } from "react-toastify";
import { Box } from "@mui/system";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import Spinner from "../../components/common/Spinner";

// Search callback constants / helpers
let searchTimeout = null;
const SEARCH_CALLBACK_WINDOW = 500;
const SEARCH_LIMIT = 10;

const DataRoomHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
`;

const StaxSearchList = styled(Box)`
  width: 100%;
  height: 450px;
  overflow-y: auto;
  padding: 5px 0;
`;

// Empty states, to help with state object resetting.
const emptyDocument = {
  _id: null,
  pages: [],
  newTag: {},
};

const emptySearchState = {
  query: null,
  results: [],
  searching: false,
  totalResults: null,
  resultsFetchedFor: 0,
};

export default withRouter((props) => {
  // ------ API Cancel Token ------

  const [cancelToken] = useState(axios.CancelToken.source());

  // ------ REFS ------

  // Query Params Info
  const urlQuery = useURLQuery();

  // Prev Info Cache
  const prevStackId = usePrevious(urlQuery.get(STACK_URL_PARAM));
  const prevDocId = usePrevious(urlQuery.get(DOC_URL_PARAM));

  // ------ STATE ------

  const [isLoading, setLoading] = useState(false);

  // Nav data
  const [fsData, setFSData] = useState({
    stacks: [],
  });

  // Current stack
  const [stack, setStack] = useState({
    _id: null,
    path: "",
  });

  // Root stack path
  const [rootStackPath, setRootStackPath] = useState(null);

  // Current stack docs
  const [docs, setDocs] = useState([]);
  const [numDocsFetchedFor, setNumDocsFetchedFor] = useState(0);

  // Current document
  const [document, setDocument] = useState({
    ...emptyDocument,
  });

  // Search State
  const [searchState, setSearchState] = useState({
    ...emptySearchState,
  });

  // URL Listening
  const location = useLocation();

  // Component Did Mount
  React.useEffect(() => {
    const onMount = async () => {
      // Fetch!
      await loading();

      // FS Data
      await loadStaxRootData();

      // NOTE Re StackLoad:
      // Stack loading on-mount is handled by the locationHook finding a new StackId!

      // NOTE Re DocLoad:
      // Document loading on-mount is handled by the locationHook finding a new DocId!

      await loaded();
    };

    onMount();

    // Unmount
    return () => {
      // Clear search timeout
      if (searchTimeout) clearTimeout(searchTimeout);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.propertyId]);

  // On Path Change
  React.useEffect(() => {
    if (props.useUrlRouting) {
      // Get params
      const newStackId = getStackIdFromUrl();
      const newDocId = getDocIdFromUrl();

      // New Stack?
      if (newStackId !== prevStackId) loadStackDocs(newStackId);

      // New Document?
      if (newDocId !== prevDocId && newDocId !== document._id)
        loadDocumentBasics(newDocId);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // On root path update
  React.useEffect(() => {
    // Trim the current stack path if needed
    if (stack && stack.path) {
      const relativePath = trimPath(stack.path);

      if (relativePath) {
        // Update the stack!
        setStack((stack) => {
          return {
            ...stack,
            path: relativePath,
          };
        });
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootStackPath, stack._id]);

  // Search Helpers
  // On search change...
  React.useEffect(() => {
    // Set timer for keystrokes
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      performSearch(searchState.query);
    }, SEARCH_CALLBACK_WINDOW);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.query]);

  const loadMoreSearchResults = async () => {
    // Skip if we've already fetched for all!
    if (
      searchState.totalResults === null ||
      searchState.totalResults <= searchState.resultsFetchedFor
    ) {
      return;
    }

    // Loading
    setSearchState((prevState) => {
      return {
        ...prevState,
        searching: true,
      };
    });

    const offset = searchState.results.length;
    const fetchXMore = SEARCH_LIMIT;
    const fetchingUpto = offset + fetchXMore;

    const res = await props.searchDocuments(
      searchState.query,
      fetchXMore,
      offset
    );

    // Result?
    if (res && res.result) {
      setSearchState((prevState) => {
        return {
          ...prevState,
          results: prevState.results.concat(res.result),
          totalResults: res.count,
        };
      });
    }

    // Done searching
    setSearchState((prevState) => {
      return {
        ...prevState,
        searching: false,
        resultsFetchedFor: fetchingUpto,
      };
    });
  };

  const performSearch = async (query) => {
    // Clear prev search
    setSearchState({
      ...emptySearchState,
      query: query,
    });

    if (!query || query === "") return;

    setSearchState((prevState) => {
      return {
        ...prevState,
        searching: true,
      };
    });

    const currentCount = searchState.results.length;
    const fetchXMore = SEARCH_LIMIT;
    const fetchingUpto = currentCount + fetchXMore;

    const res = await props.searchDocuments(query, fetchXMore);

    // Result?
    if (res && res.result) {
      setSearchState((prevState) => {
        return {
          ...prevState,
          results: res.result,
          totalResults: res.count,
        };
      });
    }

    // Done searching
    setSearchState((prevState) => {
      return {
        ...prevState,
        searching: false,
        resultsFetchedFor: fetchingUpto,
      };
    });
  };

  const trimPath = (path) => {
    if (rootStackPath && path.startsWith(rootStackPath) && rootStackPath !== "")
      return path.substring((rootStackPath + "/").length);

    return null;
  };

  const loading = () => {
    if (props.loadIconInternal) setLoading(true);
    else if (props.loading) props.loading();
  };
  const loaded = () => {
    if (props.loadIconInternal) setLoading(false);
    else if (props.loaded) props.loaded();
  };

  // ------ URL Handling ------

  const getStackIdFromUrl = () => {
    return urlQuery.get(STACK_URL_PARAM);
  };
  const getDocIdFromUrl = () => {
    return urlQuery.get(DOC_URL_PARAM);
  };

  const getBasePath = () => {
    // Get path
    return window.location.pathname;
  };

  const resetFolderState = async () => {
    // Reset numDocsFetchedFor
    setNumDocsFetchedFor(0);
  };

  // Data Loading
  const loadStaxRootData = async () => {
    // Get the fs-style directory structure data
    const res = await props.fetch_getAllStacks();
    if (!res || !res.stacks) return;

    // If we have a manual stack root...
    if (props.rootStack) {
      // Find the relevant stack
      const rootStackData = res.stacks.find((s) => s._id === props.rootStack);

      // Couldn't find?
      if (!rootStackData) return;

      // Cache the root path
      const rootPath = rootStackData.path;
      setRootStackPath(rootPath);

      let filteredStacks = res.stacks
        .map((curStack) => {
          // Not a sub element?
          if (!curStack.path.startsWith(rootPath)) return null;

          // Get the subPath
          const parentPath = rootPath + "/";
          const childPath = curStack.path;
          const relativePath = childPath.substring(parentPath.length);

          // Use the updated stack!
          return {
            ...curStack,
            path: relativePath,
          };
        })
        .filter((s) => s !== null);

      return await setFSData({
        stacks: filteredStacks,
      });
    }

    await setFSData({
      stacks: res.stacks,
    });
  };

  const moreDocsToLoad = () => {
    // Check if there are any more docuemnts to be loaded in this stack

    // Docs length is the length we fetched for?
    return docs.length === numDocsFetchedFor;
  };

  const loadMoreStackDocs = async (stackId) => {
    // Don't do this if we already tried to fetch this many!
    if (!moreDocsToLoad()) return;

    // Get offset
    const fetchOffset = docs.length;

    // Fetch
    await loading();
    const res = await props.fetch_listStack(
      stackId,
      DOC_FETCH_BATCH_SIZE,
      fetchOffset
    );

    // Update num fetched for
    setNumDocsFetchedFor(fetchOffset + DOC_FETCH_BATCH_SIZE);

    // Add docs
    if (res && res.docs) {
      await setDocs((prevDocs) => {
        return [...prevDocs, ...res.docs];
      });
    }

    await loaded();
  };

  const loadStackDocs = async (stackId) => {
    // Reset State
    resetFolderState();

    // Base?
    if (!stackId) {
      await setStack({ _id: null, path: "" });
      await setDocs([]);
      return;
    }

    await loading();

    // Fetch docs in stack
    const res = await props.fetch_listStack(stackId, DOC_FETCH_BATCH_SIZE);

    // Valid response?
    if (res && res.stack && res.docs) {
      const keys = res.stack.keys ? res.stack.keys : [];
      if (res.fields)
        for (const key of res.fields) if (!keys.includes(key)) keys.push(key);
      await setStack({
        ...res.stack,
        keys,
      });
      await setDocs(res.docs);

      // Update num docs we fetched up to
      setNumDocsFetchedFor(DOC_FETCH_BATCH_SIZE);
    }

    // Else, empty the local data!
    else {
      await setStack({ _id: stackId, path: "" });
      await setDocs([]);
    }

    await loaded();
  };

  // Helper to get the stackData for the current browsed stack
  const getCurrentRootStack = () => {
    // Current stack
    if (stack && stack._id && stack.path) return stack;
    // Find in fs w/ URL?
    else if (props.useUrlRouting && fsData && fsData.stacks) {
      return fsData.stacks.find((s) => s._id === urlQuery.get(STACK_URL_PARAM));
    }

    // Couldn't find
    return null;
  };

  // Get all visible stacks
  const getVisibleStacks = () => {
    let dir = "";
    const curStack = getCurrentRootStack();
    if (curStack) dir = curStack.path;

    // Get list of subStacks
    return listdir(fsData.stacks, dir);
  };

  // Construct a link path for viewing a given stack / doc
  const constructNewViewingPath = (stackId = null, docId = null) => {
    // Init
    let newPath = getBasePath();

    if (!stackId && !docId) return newPath;

    // Begin query params
    newPath += "?";

    // Cary the stack
    if (stackId) newPath += STACK_URL_PARAM + "=" + stackId + "&";

    // Document path
    if (docId) newPath += DOC_URL_PARAM + "=" + docId;

    return newPath;
  };

  const openDocument = (doc) => {
    // Get Stack and Doc
    const stackId = getStackIdFromUrl();
    const docId = doc._id;

    const newPath = constructNewViewingPath(stackId, docId);

    // Manage with routing?
    if (props.useUrlRouting) props.history.push(newPath);
    else loadDocumentBasics(docId);
  };

  const goToStack = (stackId) => {
    // Manage with routing?
    if (props.useUrlRouting) {
      if (stackId === null) {
        props.history.push(getBasePath());
      } else {
        props.history.push(
          getBasePath() + "?" + STACK_URL_PARAM + "=" + stackId
        );
      }
    }

    // Manage locally
    else {
      loadStackDocs(stackId);
    }
  };

  const exitDocument = () => {
    // Get stack id
    const stackId = getStackIdFromUrl();
    const newPath = constructNewViewingPath(stackId);

    // Manage with routing?
    if (props.useUrlRouting) props.history.push(newPath);
    else loadDocumentBasics(null);
  };

  // ------ DOCUMENT HANDLING ------

  const fetchDocumentBasics = async (docId, cancelToken) => {
    loading();

    // Get doc
    const res = await props.fetch_documentBasics(docId, cancelToken);

    loaded();

    if (!res || !res.doc) {
      toast.error("Unable to load document.");
      return null;
    }

    return res.doc;
  };

  const loadDocumentBasics = async (docId) => {
    // Empty?
    if (!docId) {
      setDocument({
        ...emptyDocument,
      });
      return;
    }

    // Fetch
    const docBasics = await fetchDocumentBasics(docId, cancelToken);
    if (!docBasics) return;

    // Apply!
    setDocument(docBasics);

    // All other data (words, pageImages, etc.) will be loaded dynamically in the DocViewer Hooks.
  };

  // Init visible params
  const visibleStacks = getVisibleStacks();

  return (
    <Box>
      {/* Search */}
      <DataRoomHeader>
        <Typography variant="h5">Stacks</Typography>
        <StackHeader
          stack={stack}
          allStacks={fsData.stacks}
          goToStack={goToStack}
          loading={loading}
          loaded={loaded}
        />
      </DataRoomHeader>
      <StackSearch
        searchState={searchState}
        setSearchState={setSearchState}
        clearSearchState={() => {
          setSearchState({
            ...emptySearchState,
          });
        }}
      />
      {/*{isLoading && <Spinner />}*/}
      {/* Current Stack Header */}

      {/* Scrollable Dirs & Docs */}
      <StaxSearchList>
        {(searchState.searching ||
          (searchState.query && searchState.query !== "")) && (
          <StaxSearchResults
            searchState={searchState}
            openDocument={openDocument}
            loadMoreSearchResults={loadMoreSearchResults}
          />
        )}

        {/*<SimpleScrollbars>*/}
        {/* Current Stack Viewer */}
        {isLoading ? (
          <Spinner />
        ) : (
          <StackViewer
            // Currnet Stack
            stack={stack}
            // Visible Stacks
            stacks={visibleStacks}
            allStacks={fsData.stacks}
            // Visible Documents
            docs={docs}
            view="grid"
            // Actions
            openDocument={openDocument}
            goToStack={goToStack}
            moreDocsToLoad={moreDocsToLoad}
            loadMoreStackDocs={() => loadMoreStackDocs(stack._id)}
          />
        )}

        {/* Current Document Viewer */}
        {document && document._id && (
          <DocumentViewer
            document={document}
            setDocument={setDocument}
            updateLocalDoc={(docId, update) => {
              setDocument((document) => {
                // Stale attempt to update?
                if (document._id !== docId) {
                  return document;
                }

                return {
                  ...document,
                  ...update,
                };
              });
            }}
            exitDocument={exitDocument}
            downloadBlob={props.downloadBlob}
          />
        )}
        {/*</SimpleScrollbars>*/}
      </StaxSearchList>
    </Box>
  );
});
