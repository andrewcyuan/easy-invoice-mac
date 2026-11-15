import { Text, View } from "@react-pdf/renderer";
import type { ComponentProps } from "react";
type ViewStyle = ComponentProps<typeof View>["style"];
interface WrappableAmountProps {
  chunks: string[];
  style?: ViewStyle;
}
export function WrappableAmount({ chunks, style }: WrappableAmountProps) {
  if (chunks.length <= 1) {
    return <Text style={style}>{chunks.join("")}</Text>;
  }
  return (
    <View
      style={[
        { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" },
        style,
      ]}
    >
      {chunks.map((chunk, index) => {
        return <Text key={index}>{chunk}</Text>;
      })}
    </View>
  );
}
