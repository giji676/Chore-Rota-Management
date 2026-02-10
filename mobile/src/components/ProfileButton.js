import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../theme";

export default function ProfileButton() {
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
        >
            <Ionicons
                name="person-circle-outline"
                size={48}
                color={colors.surface}
            />
        </TouchableOpacity>
    );
}
