import React, { useEffect } from "react";
import { TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../auth/useAuth";
import { colors } from "../theme";

function ProfileButton() {
    const { user } = useAuth();

    if (!user) return null;

    const navigation = useNavigation();
    const avatarUrl = user.avatar ? `${process.env.EXPO_PUBLIC_URL}${user.avatar}` : null;

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
        >
            {user?.avatar ? (
                <Image 
                    source={{ uri: avatarUrl }}
                    style={{ width: 42, height: 42, borderRadius: 50 }}
                />
            ) : (
                    <Ionicons
                        name="person-circle-outline"
                        size={48}
                        color={colors.surface}
                    />
            )}
        </TouchableOpacity>
    );
}
export default React.memo(ProfileButton, (prev, next) => prev.user === next.user);
