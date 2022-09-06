import React from "react";
import "../styles/searchResult.css";
import StaxSearchResult from "./StaxSearchResult";
import generateKey from "../../UniqueKey";
import { Box } from "@mui/system";
import Spinner from "../../components/common/Spinner";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { styled } from "@mui/material/styles";

const StyledDivider = styled(Divider)`
  margin: 8px 0;
  border: 2px solid rgba(115, 100, 155, 0.1);
`;

const StaxSearchResults = (props) => {
  const searchState = props.searchState;

  return (
    <Box>
      {/* Centered Loading? (no results yet) */}
      {searchState.results.length === 0 && searchState.searching && <Spinner />}
      {/* Results? */}
      {searchState.results.length > 0 && (
        <>
          {searchState.results.map((result, rIdx) => {
            return (
              <StaxSearchResult
                key={rIdx + generateKey()}
                document={result}
                onClick={() => props.openDocument({ _id: result._id })}
              />
            );
          })}
          <StyledDivider />

          {/* Fetch More */}
          {searchState.totalResults > searchState.resultsFetchedFor && (
            <>
              {/* Load more button */}
              {searchState.searching ? (
                <Spinner />
              ) : (
                <>
                  <div
                    className="load-more-stax-results"
                    onClick={props.loadMoreSearchResults}
                  >
                    Load More
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* No Results? */}
      {searchState.query &&
        !searchState.searching &&
        searchState.resultsFetchedFor > 0 &&
        searchState.results.length === 0 && (
          <Box>
            <Typography variant="body2">No Documents Found</Typography>
            <StyledDivider />
          </Box>
        )}
    </Box>
  );
};

export default StaxSearchResults;
