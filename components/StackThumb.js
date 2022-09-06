import React from "react";
import { withRouter } from "react-router-dom";

import "../styles/stackViewer.css";
import { DirectoryIcon } from "../../components/SvgIcons";
import { styled } from "@mui/system";
import {
  StaxResultCard,
  ThumbLabel,
  ThumbName,
} from "../styles/DocumentBrowser.styles";
import Typography from "@mui/material/Typography";
import { ThemeMode } from "../../Redux/ThemeSlice";
import { useSelector } from "react-redux";

const DocumentCounter = styled(Typography)`
  font-weight: 500;
  font-size: 12px;
  line-height: 15px;
  color: #818a94;
`;

export default withRouter((props) => {
  const theme = useSelector(ThemeMode);
  // Init params needed
  const stack = props.stack;
  return (
    <StaxResultCard
      // Styles
      themeMode={theme}
      draggable={true}
      onClick={props.goToStack}
      // Dragged over element
      onDragStart={(e) => {
        e.preventDefault();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      // Drop callback
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title={stack.path + " - Click to open stack"}
    >
      <ThumbLabel>
        <DirectoryIcon />
        <ThumbName themeMode={theme}>{props.stackName}</ThumbName>
      </ThumbLabel>
      <DocumentCounter themeMode={theme}>
        {stack.numDocuments.length === 1
          ? `1 item`
          : `${stack.numDocuments} items`}
      </DocumentCounter>
    </StaxResultCard>
  );
});
