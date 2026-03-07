import { Radio, RadioGroup } from "@headlessui/react";
import { useEffect } from "react";
import { BASE_URL } from "../config";
import { useColorContext } from "../context/ColorContext";
import type { ColorsResponse } from "../interfaces";

interface Props {
  filamentType: string;
}

// v2 ColorPicker: consumes the new /v2/colors API which already
// returns data in the ColorsResponse shape.
const ColorPickerV2: React.FC<Props> = ({ filamentType }) => {
  const { state, dispatch } = useColorContext();
  const { colorOptions, isLoading, color } = state;

  useEffect(() => {
    const fetchColors = async () => {
      dispatch({ type: "SET_IS_LOADING", payload: true });
      try {
        const url = new URL(`${BASE_URL}/v2/colors`);
        if (filamentType) url.searchParams.set("profile", filamentType);

        const response = await fetch(url.toString());

        type V2ColorsEnvelope = {
          success: boolean;
          message: string;
          data: ColorsResponse[];
        };

        const json = (await response.json()) as V2ColorsEnvelope;
        const colors = json.data ?? [];

        console.log("Fetched colors (v2):", colors);
        dispatch({ type: "SET_COLOR_OPTIONS", payload: colors });
      } catch (error) {
        console.error("Failed to fetch v2 colors:", error);
      } finally {
        dispatch({ type: "SET_IS_LOADING", payload: false });
      }
    };

    if (filamentType) fetchColors();
  }, [filamentType, dispatch]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <fieldset aria-label="Choose a color" className="mt-2">
      <RadioGroup
        value={color}
        onChange={(newColor) =>
          dispatch({ type: "SET_COLOR", payload: newColor })
        }
        className="flex items-center space-x-3">
        {colorOptions?.map((colorOption, index) => (
          <Radio
            key={`${colorOption.hexValue}-${index}`}
            value={colorOption.hexValue}
            className={({ checked }) =>
              `relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none ${
                checked ? "ring-2 ring-offset-1 ring-blue-500" : ""
              }`
            }>
            {({ checked }) => (
              <>
                <span
                  aria-hidden="true"
                  className="h-8 w-8 rounded-full border border-black border-opacity-10"
                  style={{ backgroundColor: `${colorOption.hexValue}` }}
                />
                <span className="sr-only">{colorOption.color}</span>
                {checked && (
                  <span
                    className="absolute inset-0 rounded-full ring-2 ring-offset-2"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </Radio>
        ))}
      </RadioGroup>
    </fieldset>
  );
};

export default ColorPickerV2;
