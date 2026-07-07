import type React from "react";
import { COLOR_PICKER_VERSION } from "../config";
import ColorPicker from "./ColorPicker";
import ColorPickerV2 from "./ColorPickerV2";

interface Props {
  filamentType: string;
}

const ColorPickerWrapper: React.FC<Props> = ({ filamentType }) => {
  if (COLOR_PICKER_VERSION === "v2") {
    return <ColorPickerV2 filamentType={filamentType} />;
  }

  // Default to v1 implementation
  return <ColorPicker filamentType={filamentType} />;
};

export default ColorPickerWrapper;
