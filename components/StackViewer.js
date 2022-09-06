import React from "react";
import "../styles/stackViewer.css";
import { withRouter } from "react-router-dom";
import StackThumb from "./StackThumb";
import DocumentThumb from "./DocumentThumb";
import { Box, styled } from "@mui/system";
import { Input } from "@mui/material";
import { DirectoryArrowIcon, SearchIcon } from "../../components/SvgIcons";
import IconButton from "@mui/material/IconButton";
import { DocumentHeaderText } from "../styles/DocumentBrowser.styles";
import Typography from "@mui/material/Typography";
import { useSelector } from "react-redux";
import { ThemeMode } from "../../Redux/ThemeSlice";

const StyledInput = styled(Input)({
  padding: "10px 4px",
  width: "100%",
});

const StyledSearchIcon = styled(IconButton)({
  padding: 10,
});

const TotalSearchesContainer = styled(Box)`
  display: flex;
  width: 100%;
  justify-content: flex-end;
  padding: 8px 0;
`;

const LoadMoreContainer = styled(Box)`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 10px;
`;

const LoadMore = styled(Typography)`
  transition: 0.3s;
  cursor: pointer;
  color: ${(props) => (props.themeMode === "light" ? "black" : "white")};
  &:hover {
    color: #009ccc;
  }
`;

export const StackSearch = (props) => {
  const theme = useSelector(ThemeMode);
  // Get query
  const query = props.searchState.query ? props.searchState.query : "";

  return (
    <Box>
      {/* Search Bar */}
      <StyledInput
        type="text"
        disableUnderline
        value={query}
        test={theme}
        onChange={(event) => {
          const value = event.target.value;

          props.setSearchState((prevState) => {
            return {
              ...prevState,
              query: value,
            };
          });
        }}
        placeholder="Search documents..."
        startAdornment={
          <StyledSearchIcon>
            <SearchIcon />
          </StyledSearchIcon>
        }
      />
      {/* Show number of total results */}
      {props.searchState.totalResults !== null &&
        !isNaN(props.searchState.totalResults) && (
          <TotalSearchesContainer>
            <DocumentHeaderText themeMode={theme}>
              {`${props.searchState.totalResults} total`}
            </DocumentHeaderText>
          </TotalSearchesContainer>
        )}
    </Box>
  );
};

const PathContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  & > p:hover {
    cursor: pointer;
  }
`;

const SelectedDirectory = styled(DocumentHeaderText)`
  color: #009ccc;
  font-weight: 600;
`;

export const StackHeader = (props) => {
  const theme = useSelector(ThemeMode);
  /*
        Header component for rendering current Stack FS Navigation Data.
    */

  // Back Stack
  let prevStackCallback;

  // Get path data!
  const pathElems =
    props.stack && props.stack.path !== "" ? props.stack.path.split("/") : [];
  const seededPathElems = [];
  for (let i = 0; i < pathElems.length; i++) {
    // Get vars
    const dirName = pathElems[i];
    const runningPath =
      seededPathElems.map((e) => e.dirName).join("") + dirName;

    // Add stack id if found
    const stack = props.allStacks.find((s) => s.path === runningPath);

    // Append
    seededPathElems.push({
      dirName: dirName,
      stack: stack ? stack : null,
      onClick: () => {
        if (stack && stack._id) props.goToStack(stack._id);
      },
    });

    // Add seperator?
    if (i < pathElems.length - 1) {
      seededPathElems.push({
        dirName: "/",
        stack: null,
      });
    }
  }

  // Get Back Button Callback
  if (pathElems.length <= 0) prevStackCallback = null;
  else if (pathElems.length === 1)
    prevStackCallback = () => props.goToStack(null);
  // Go to root
  else {
    const prevStackPath = pathElems.slice(0, -1).join("/");
    const prevStack = props.allStacks.find((s) => s.path === prevStackPath);
    prevStackCallback = () => {
      if (prevStack && prevStack._id) props.goToStack(prevStack._id);
    };
  }

  return (
    <PathContainer>
      {/* Back Button */}
      {prevStackCallback !== null && (
        <DocumentHeaderText onClick={prevStackCallback} themeMode={theme}>
          Root
        </DocumentHeaderText>
      )}

      {/* Working Path */}
      {seededPathElems.length > 0 && (
        <Box>
          {seededPathElems.map((dirData, dirIdx) => {
            const dir = dirData.dirName;

            const isSeperator = dir === "/";
            const stack = dirData.stack;

            return (
              <PathContainer>
                <DirectoryArrowIcon />
                <SelectedDirectory
                  key={dirIdx}
                  onClick={() => {
                    if (isSeperator) return;
                    if (!stack || !stack._id) return;
                    props.goToStack(stack._id);
                  }}
                >
                  {dir}
                </SelectedDirectory>
              </PathContainer>
            );
          })}
        </Box>
      )}
    </PathContainer>
  );
};

const StackList = styled(Box)`
  margin-top: 10px;
`;

export default withRouter((props) => {
  const theme = useSelector(ThemeMode);
  /*
        Component for rendering Stack Naviation (i.e. folder & document navigation.)
    */

  // Initailize properties
  const docs = props.docs ? props.docs : [];

  return (
    <Box>
      {/* Current SubStacks */}
      {props.stacks && props.stacks.length > 0 && (
        <>
          <StackList>
            {props.stacks.map((stack, idx) => (
              <StackThumb
                key={idx}
                stackName={stack.relativePath}
                stack={stack}
                view="grid"
                // Methods
                goToStack={() => props.goToStack(stack._id)}
              />
            ))}
          </StackList>
        </>
      )}
      {/* Current SubDocuments */}
      {docs && docs.length > 0 && (
        <>
          <StackList>
            {docs.map((doc) => (
              <DocumentThumb
                key={doc.document_uuid}
                doc={doc}
                view="grid"
                // Methods
                openDocument={() => props.openDocument(doc)}
              />
            ))}
          </StackList>

          {props.moreDocsToLoad() && (
            <LoadMoreContainer>
              <LoadMore onClick={props.loadMoreStackDocs} themeMode={theme}>
                Load More Documents...
              </LoadMore>
            </LoadMoreContainer>
          )}
        </>
      )}
    </Box>
  );
});
