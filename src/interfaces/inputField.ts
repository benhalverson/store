export interface InputFieldProps {
	id: string;
	label: string;
	autoComplete?: string;
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}