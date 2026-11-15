import { useId } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import type { LocalFont } from "./fonts";
export function FontPicker({
  fonts,
  value,
  onChange,
}: {
  fonts: LocalFont[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const selected = fonts.find((font) => font.id === value) ?? null;
  return (
    <Combobox.Root
      items={fonts}
      value={selected}
      onValueChange={(font) => {
        if (font) onChange(font.id);
      }}
      itemToStringLabel={(font) => font.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <div className="field">
        <label className="field-label" htmlFor={id}>
          Font Book
        </label>
        <Combobox.Trigger id={id} className="select-trigger">
          <span>{selected?.name || "Missing font — Open Sans"}</span>
          <ChevronsUpDown size={14} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={5} className="popup-positioner">
          <Combobox.Popup className="font-popup" initialFocus>
            <div className="font-search">
              <Search size={15} />
              <Combobox.Input
                className="font-search-input"
                placeholder="Search installed fonts…"
                aria-label="Search installed fonts"
              />
            </div>
            <Combobox.Empty className="empty-state">
              No matching fonts.
            </Combobox.Empty>
            <Combobox.List className="font-results">
              {(font: LocalFont) => (
                <Combobox.Item
                  key={font.id}
                  value={font}
                  className="select-item"
                  style={{
                    fontFamily:
                      font.id === "__system"
                        ? "-apple-system"
                        : `"${font.family.replace(/"/g, "")}"`,
                    fontStyle: font.italic ? "italic" : "normal",
                    fontWeight: font.weight,
                  }}
                >
                  <span>{font.name}</span>
                  <span className="font-sample">Aa 0123</span>
                  <Combobox.ItemIndicator>
                    <Check size={14} />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
