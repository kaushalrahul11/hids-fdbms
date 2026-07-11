"use client";

import { Select, TextInput } from "./form-controls";
import { OTHER } from "@/lib/constants";

export function SelectOrOther({
  value,
  onChange,
  options,
  placeholder = "Select",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const isKnown = options.includes(value);
  const isOther = value !== "" && !isKnown;

  return (
    <div className="space-y-2">
      <Select
        value={isOther ? OTHER : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === OTHER ? " " : v); // seed a non-empty value so the text box appears
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value={OTHER}>{OTHER}</option>
      </Select>
      {isOther && (
        <TextInput
          placeholder="Type the name"
          value={value.trim() === "" ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}
