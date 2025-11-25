import { useState, useEffect } from "react";
import { TouchableOpacity, View } from "react-native";

export default function CheckBox({ onPress, checked: checkedProp, style, checkStyle }) {
    const [checked, setChecked] = useState(checkedProp || false);

    useEffect(() => {
        setChecked(checkedProp);
    }, [checkedProp]);

    const handlePress = () => {
        const newValue = !checked;
        setChecked(newValue);
        if (onPress) onPress(newValue);
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
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
