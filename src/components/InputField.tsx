import type { InputFieldProps } from "../interfaces/inputField";

const InputField = ({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: InputFieldProps) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm/6 font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="mt-2">
        <input
          id={id}
          name={id}
          type="text"
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="block w-full rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm/6"
        />
      </div>
    </div>
  );
};

export default InputField;
