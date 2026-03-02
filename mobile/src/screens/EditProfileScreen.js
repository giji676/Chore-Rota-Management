import React, { useState, useEffect, useLayoutEffect } from "react";
import {
    View,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import api from "../utils/api";
import { useAuth } from "../auth/useAuth";
import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";
import EditHeader from "../components/EditHeader";

const PROFILE_COLORS = [
    "#FF6B6B", // red
    "#4ECDC4", // teal
    "#556270", // slate
    "#C7F464", // lime
    "#C44D58", // rose
    "#FF9F1C", // orange
    "#2EC4B6", // aqua
    "#6A4C93", // purple
    "#F72585", // pink
    "#3A86FF", // blue
    "#8338EC", // violet
    "#FFBE0B", // amber
    "#8AC926", // green
    "#1982C4", // cobalt
    "#FF595E", // coral
    "#B5179E", // magenta
];

export default function EditProfileScreen({ navigation }) {
    const { user, setUser, logout } = useAuth();

    const avatarUrl = user?.avatar ? `${process.env.EXPO_PUBLIC_URL}${user.avatar}` : null;

    // State for editable fields
    const [email, setEmail] = useState(user?.email || "");
    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [selectedColor, setSelectedColor] = useState(user?.profile_color || PROFILE_COLORS[0]);

    // Password change fields
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSave = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            console.log("New password and confirm password do not match!");
            return;
        }

        const payload = {
            email,
            first_name: firstName,
            last_name: lastName,
            bg_color: selectedColor,
            ...(oldPassword ? { old_password: oldPassword, new_password: newPassword } : {}),
        };

        try {
            const res = await api.put("accounts/user/", payload);
            setUser(res.data);
        } catch (err) {
            console.error("Failed to update profile:", err);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (props) => <EditHeader {...props} onSave={handleSave} />,
        });
    }, [navigation, handleSave, email, firstName, lastName, selectedColor, oldPassword, newPassword, confirmPassword]);

    return (
        <ScrollView style={styles.scroll}>
            <View style={styles.topContainer}>
                <View style={styles.iconContainer}>
                    {user?.avatar ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Ionicons
                                name="person-circle-outline"
                                size={100}
                                color={colors.surface}
                            />
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.container}>
                {/* Email & Name */}
                <View style={{ gap: spacing.md }}>
                    <AppText>Email</AppText>
                    <AppTextInput value={email} onChangeText={setEmail} style={styles.fieldInput} />

                    <AppText>Name</AppText>
                    <View style={{ flexDirection: "row", gap: spacing.md }}>
                        <AppTextInput value={firstName} onChangeText={setFirstName} style={[styles.fieldInput, { flex: 1 }]} />
                        <AppTextInput value={lastName} onChangeText={setLastName} style={[styles.fieldInput, { flex: 1 }]} />
                    </View>

                    {/* Profile Color */}
                    <AppText>Profile Color</AppText>
                    <View style={styles.colorsContainer}>
                        {PROFILE_COLORS.map((color) => (
                            <Pressable
                                key={color}
                                onPress={() => setSelectedColor(color)}
                                style={[
                                    styles.colorCircle,
                                    { backgroundColor: color },
                                    selectedColor === color && { borderWidth: 3, borderColor: colors.textPrimary },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Password Change */}
                    <AppText>Change Password</AppText>
                    <AppTextInput
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Old Password"
                        secureTextEntry
                        style={styles.fieldInput}
                    />
                    <AppTextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New Password"
                        secureTextEntry
                        style={styles.fieldInput}
                    />
                    <AppTextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm New Password"
                        secureTextEntry
                        style={styles.fieldInput}
                    />
                </View>

                <View style={{ flex: 1 }} />

                {/* Buttons */}
                <AppButton title="Log Out" onPress={logout} variant="secondary" />
                <AppButton title="Delete Account" onPress={() => console.log("Delete account")} variant="secondary" textStyle={{ color: colors.error }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    topContainer: {
        backgroundColor: colors.primary,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    iconContainer: {
        padding: 50,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarFallback: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    fieldInput: {
        ...typography.body,
        borderBottomWidth: 1,
        paddingVertical: spacing.xs,
    },
    colorsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginVertical: spacing.md,
    },
    colorCircle: {
        margin: spacing.xs,
        width: 38,
        height: 38,
        borderRadius: 50,
        aspectRatio: 1,
    },
});
