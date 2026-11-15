import { Select as Primitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
export function Select({
  id,
  value,
  onValueChange,
  items,
  placeholder,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <Primitive.Root
      items={items}
      value={value}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v);
      }}
    >
      <Primitive.Trigger id={id} className="select-trigger">
        <Primitive.Value placeholder={placeholder} />
        <Primitive.Icon>
          <ChevronDown size={14} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Positioner
          sideOffset={5}
          alignItemWithTrigger={false}
          className="popup-positioner"
        >
          <Primitive.Popup className="select-popup">
            <Primitive.List>
              {items.map((item) => (
                <Primitive.Item
                  className="select-item"
                  key={item.value}
                  value={item.value}
                >
                  <Primitive.ItemText>{item.label}</Primitive.ItemText>
                  <Primitive.ItemIndicator>
                    <Check size={14} />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.List>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
