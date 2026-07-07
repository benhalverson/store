import { Radio, RadioGroup } from "@headlessui/react";
import { useEffect } from "react";
import { BASE_URL } from "../config";
import { useColorContext } from "../context/ColorContext";
import type { ColorsResponse } from "../interfaces";

type V2ColorsEnvelope = {
  success: boolean;
  message: string;
  data?: ColorsResponse[];
  count?: number;
  lastUpdated?: string;
  error?: string;
};

const ColorPicker: React.FC<Props> = ({ filamentType }) => {
  const { state, dispatch } = useColorContext();
  const { colorOptions, isLoading, color } = state;

  useEffect(() => {
    const fetchColors = async () => {
      dispatch({ type: "SET_IS_LOADING", payload: true });
      try {
        const url = new URL(`${BASE_URL}/v2/colors`);
        url.searchParams.set("profile", filamentType.toUpperCase());
        url.searchParams.set("available", "true");

        const response = await fetch(url.toString());
        const json = (await response.json()) as V2ColorsEnvelope;

        if (!response.ok || !json.success) {
          throw new Error(
            json.message || `Failed to fetch v2 colors (${response.status})`,
          );
        }

        dispatch({ type: "SET_COLOR_OPTIONS", payload: json.data ?? [] });
      } catch (error) {
        console.error("Failed to fetch v2 colors:", error);
        dispatch({ type: "SET_COLOR_OPTIONS", payload: [] });
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

export default ColorPicker;

interface Props {
  filamentType: string;
}
