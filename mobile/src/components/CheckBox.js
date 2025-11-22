import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

export default function CheckBox({ style, checkStyle }) {
    const [checked, setChecked] = useState(false);

    return (
        <TouchableOpacity
            onPress={() => setChecked(!checked)}
            style={[
                {
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: checked ? "#4CAF50" : "#888",
                    justifyContent: "center",
                    alignItems: "center",
                },
                style
            ]}
        >
            {checked && (
                <View
                    style={[
                        {
                            width: 12,
                            height: 12,
                            backgroundColor: "#4CAF50",
                            borderRadius: 2,
                        },
                        checkStyle
                    ]}
                />
            )}
        </TouchableOpacity>
    );
}
