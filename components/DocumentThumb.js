import React from "react";
import "../styles/stackViewer.css";
import {
  StaxResultCard,
  ThumbLabel,
  ThumbName,
} from "../styles/DocumentBrowser.styles";
import { FileIcons } from "../../components/SvgIcons";
import { useSelector } from "react-redux";
import { ThemeMode } from "../../Redux/ThemeSlice";

const DocumentThumb = (props) => {
  const theme = useSelector(ThemeMode);
  /*
    
        Component for rendering Stax Docuemnt Thumbnails 
        (i.e. thumbnail image, and descriptive text).

    */

  // Parse data needed
  const doc = props.doc;

  return (
    <StaxResultCard
      themeMode={theme}
      // Actions
      onDoubleClick={props.openDocument}
      onDragStart={(e) => {
        e.preventDefault();
      }}
    >
      <ThumbLabel>
        <FileIcons />
        <ThumbName themeMode={theme}>{doc.name}</ThumbName>
      </ThumbLabel>
    </StaxResultCard>
  );
};

export default DocumentThumb;
