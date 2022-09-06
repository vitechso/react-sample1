/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import StaxDocBrowser from "./components/StaxDocBrowser";
import { useAuth0 } from "@auth0/auth0-react";

import api from "../api";
import { styled } from "@mui/material/styles";
import { Box } from "@mui/system";
import { useSelector } from "react-redux";
import { selectedPropertyId } from "../Redux/CommonSlice";
import { useParams } from "react-router-dom";

const DocumentBrowserContainer = styled(Box)({
  height: 500,
  width: "100%",
});

const PropertyDocumentBrowser = () => {
  const { getAccessTokenSilently } = useAuth0();
  const selectedId = useSelector(selectedPropertyId);
  const { id } = useParams();
  const propId = id ? id : selectedId;

  // Current Documents / Pseudo Stacks for nav
  const [pseudoStacks, setPseudoStacks] = useState([]);
  const [propertyDocs, setPropertyDocs] = useState([]);

  // Fetch all documents for a property
  const getAllPropertyDocs = async (propertyId) => {
    let docs = [];

    // Access token
    const accessToken = await getAccessTokenSilently({
      audience: process.env.REACT_APP_AUDIENCE,
      scope: "read:users",
    });

    // Base URL
    let baseURL =
      api.raedenApiUrl + "/property/" + propertyId + "/staxdocuments";

    // Offsets for fetching all.
    let offset = 0;
    let batchLimit = 200;

    let counter = 0;
    let maxIterations = 200;

    // Get documents until we run out....
    while (counter < maxIterations) {
      // Fetch for the batch size
      const url = baseURL + "?offset=" + offset + "&limit=" + batchLimit;
      let res = await api.get(url, {}, {}, accessToken, false);

      // No Res?
      if (!res || !res.docs || res.docs.length === 0) {
        break;
      }

      const flattenedResult = Object.values(res.docs);

      // Add result to list
      docs = docs.concat(flattenedResult);

      // Did we not fetch as many as we asked for? If so, we hit the end.
      if (flattenedResult.length < batchLimit) {
        break;
      }

      // Update the offset
      offset += batchLimit;

      // Continue to next iteration!
    }

    // Update docId to refer to Reaeden DocUUID for document fetch callbacks.
    docs = docs.map((doc) => {
      return {
        ...doc,
        pages: doc.pages ? doc.pages : [],
        _id: doc.document_uuid ? doc.document_uuid : null,
      };
    });

    return docs;
  };

  const fetchDocumentEssentials = async (docId) => {
    // Access token
    const accessToken = await getAccessTokenSilently({
      audience: process.env.REACT_APP_AUDIENCE,
      scope: "read:users",
    });

    let url = api.raedenApiUrl + "/document/" + docId + "/view";

    return await api.get(url, {}, {}, accessToken, false);
  };

  const getAllStaxNavData = async () => {
    // Fetch all property documents
    const allPropertyDocs = await getAllPropertyDocs(propId);
    setPropertyDocs(allPropertyDocs);

    // Create the "pseudo stacks" based on the documents documentType
    let pseudoStackNames = {};
    for (let docData of allPropertyDocs) {
      // Get the pseudo stack.
      const pseudoStackName = docData.stack_name;

      // Add if needed
      if (!Object.keys(pseudoStackNames).includes(pseudoStackName))
        pseudoStackNames[pseudoStackName] = 0;

      pseudoStackNames[pseudoStackName] += 1;
    }

    // Turn the pseudo stack names into valid stacks!
    let pseudoStacks = Object.keys(pseudoStackNames).map((name) => {
      return {
        _id: name,
        path: name,
        numDocuments: pseudoStackNames[name],
      };
    });

    // Save
    setPseudoStacks(pseudoStacks);

    // Return
    return {
      stacks: pseudoStacks,
    };
  };

  // List the contents of a given stack
  const listStackContents = async (stackId) => {
    // In our model, the StackId passed in will need to match the documents from the state.
    const subDocs = propertyDocs.filter((doc) => {
      return doc.stack_name === stackId;
    });

    const stack = pseudoStacks.find((stack) => stack._id === stackId);

    return {
      stack,
      docs: subDocs,
    };
  };

  const downloadBlob = async (endpoint, skipAuth = false, config = {}) => {
    /*
            A simple axios helper to download a blob file from the specified url.
        */

    return await api.downloadBlob(endpoint, config);
  };

  const searchDocuments = async (searchQuery, searchLimit = 10, offset = 0) => {
    // Get access token
    const accessToken = await getAccessTokenSilently({
      audience: process.env.REACT_APP_AUDIENCE,
      scope: "read:users",
    });

    // Construct URL
    let url =
      api.raedenApiUrl +
      "/document/search" +
      "?query=" +
      searchQuery +
      "&propertyid=" +
      propId +
      "&limit=" +
      searchLimit +
      "&offset=" +
      offset;

    // Request!
    const res = await api.get(url, {}, {}, accessToken, false);

    // Format into documents array
    if (res && res.result) {
      const flattenedResult = Object.values(res.result).map((doc) => {
        return {
          ...doc,
          stax_id: doc._id ? doc._id : null,
          _id: doc.document_uuid ? doc.document_uuid : null,
        };
      });
      return { result: flattenedResult, count: res.count };
    }

    // Search
    return null;
  };

  return (
    <DocumentBrowserContainer>
      <StaxDocBrowser
        propertyId={propId}
        // Use internal loading icon
        loadIconInternal={true}
        // Allow URL Routing, so the component state persists on browser refresh.
        // NOTE: Does not work with current <ProtectedRoute/>.
        // Updating the URL causes the components to remount.
        useUrlRouting={false}
        // Root stack can be uses to make the root-directory a specific directory.
        // Just provide the stackId!
        // rootStack={null}

        // Stax data fetching callbacks
        fetch_getAllStacks={getAllStaxNavData}
        fetch_listStack={listStackContents}
        fetch_documentBasics={fetchDocumentEssentials}
        downloadBlob={downloadBlob}
        searchDocuments={searchDocuments}
      />
    </DocumentBrowserContainer>
  );
};

export default PropertyDocumentBrowser;
