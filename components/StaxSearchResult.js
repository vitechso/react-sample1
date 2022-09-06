import React from "react";

import "../styles/searchResult.css";
import {
  StaxResultCard,
  ThumbLabel,
  ThumbName,
} from "../styles/DocumentBrowser.styles";
import { FileIcons } from "../../components/SvgIcons";
import { useSelector } from "react-redux";
import { ThemeMode } from "../../Redux/ThemeSlice";

const StaxSearchResult = (props) => {
  const theme = useSelector(ThemeMode);
  return (
    <StaxResultCard onClick={props.onClick} themeMode={theme}>
      <ThumbLabel>
        <FileIcons />
        <ThumbName sx={{ color: theme === "light" ? "#000000" : "#ffffff" }}>
          {props.document.name}
        </ThumbName>
      </ThumbLabel>
    </StaxResultCard>
  );
};

export default StaxSearchResult;
