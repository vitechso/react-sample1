import { Box, styled } from "@mui/system";
import Typography from "@mui/material/Typography";

export const StaxResultCard = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  border-radius: 4px;
  padding: 0 16px;
  margin: 0 5px;

  &:hover {
    color: white;
    cursor: pointer;
    outline: 1px solid #009ccc;
    background-color: ${(props) =>
      props.themeMode === "light" ? "#009ccc" : "#24263a"};

    & > p {
      color: white;
    }

    & > div > p {
      color: white;
    }
  }
`;

export const DocumentHeaderText = styled(Typography)`
  font-weight: 400;
  font-size: 11px;
  line-height: 14px;
  color: ${(props) => (props.themeMode === "light" ? "#000000" : "#FFFFFF")};
`;

export const ThumbLabel = styled(Box)`
  display: flex;
  align-items: center;
  & > p {
    padding-left: 16px;
  }
`;

export const ThumbName = styled(Typography)`
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => (props.themeMode === "light" ? "black" : "white")};
`;
