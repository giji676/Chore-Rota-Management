import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import api from "../utils/api";
import { useAuth } from "../auth/useAuth";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText"
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

export default function ProfileScreen({ route, navigation }) {
    const { user, logout } = useAuth();

    const avatarUrl = user?.avatar ? `${process.env.EXPO_PUBLIC_URL}${user.avatar}` : null;

    return (
        <>
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
                <View style={styles.edit}>
                    <FontAwesome
                        name="pencil"
                        size={22}
                        color={colors.txtPrimary}
                    />
                </View>
            </View>
            <View style={styles.container}>
                <View style={{ gap: spacing.md }}>
                    <AppText>
                        Email
                        {!user?.is_verified && (
                            <>
                                {" - "}
                                <AppText
                                    onPress={() => navigation.navigate("VerifyEmail", {email: user?.email})}
                                    style={{ color: colors.error, textDecorationLine: "underline" }}
                                >
                                    Not verified
                                </AppText>
                            </>
                        )}
                    </AppText>
                    <AppText style={styles.fieldDisplay}>{user?.email}</AppText>

                    <AppText>Name</AppText>
                    <View style={{ flexDirection: "row", gap: spacing.md }}>
                        <AppText style={styles.fieldDisplay}>{user?.first_name}</AppText>
                        <AppText style={styles.fieldDisplay}>{user?.last_name}</AppText>
                    </View>
                </View>

                <View style={{ flex: 1 }}/>

                <AppButton
                    title="Logot"
                    onPress={logout}
                    variant="secondary"
                />

                <AppButton
                    title="Delete Account"
                    onPress={() => console.log("Delete account")}
                    variant="secondary"
                    textStyle={{ color: colors.error }}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.lg,
    },
    subTitle: {
        ...typography.h3,
        marginTop: spacing.lg,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.xs,
    },
    underlinedText: {
        ...typography.body,
        borderBottomWidth: 1,
        borderColor: colors.divider,
    },
    iconContainer: {
        backgroundColor: colors.primary,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        padding: 50,
        gap: spacing.md,
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
    edit: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: spacing.md,
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    fieldDisplay: {
        ...typography.body,
        borderBottomWidth: 1,
        paddingVertical: spacing.xs,
    },
});
