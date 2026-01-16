import { Text, TextProps } from "react-native";
import { colors } from "../theme/colors";

export default function AppText(props: TextProps) {
    return (
        <Text
            {...props}
            style={[
                { color: colors.textPrimary },
                props.style,
            ]}
        />
    );
}
