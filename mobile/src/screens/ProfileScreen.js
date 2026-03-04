import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
} from "react-native";
import {
    Ionicons,
    FontAwesome,
    FontAwesome5,
    MaterialCommunityIcons,
} from "@expo/vector-icons";

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
                <Pressable
                    onPress={() => navigation.navigate("EditProfile")}
                    style={styles.editIcon}
                >
                    <FontAwesome
                        name="pencil"
                        size={22}
                        color={colors.txtPrimary}
                    />
                </Pressable>
            </View>
            <View style={styles.container}>
                <View style={{ gap: spacing.lg }}>
                    <View style={styles.profileField}>
                        <MaterialCommunityIcons
                            name="email-outline"
                            size={spacing.xl}
                            color="black"
                        />

                        <View style={{ flex: 1 }}>
                            <AppText>
                                Email
                                {!user?.is_verified && (
                                    <>
                                        {" - "}
                                        <AppText
                                            onPress={() =>
                                                navigation.navigate("VerifyEmail", {
                                                    email: user?.email,
                                                })
                                            }
                                            style={{
                                                color: colors.error,
                                                textDecorationLine: "underline",
                                            }}
                                        >
                                            Not verified
                                        </AppText>
                                    </>
                                )}
                            </AppText>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ flexGrow: 1 }}
                            >
                                <AppText
                                    style={styles.fieldDisplay}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {user?.email}
                                </AppText>
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.profileField}>
                        <FontAwesome5
                            name="user"
                            size={spacing.xl}
                            color="black"
                        />

                        <View style={{ flex: 1 }}>
                            <AppText>Name</AppText>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ flexGrow: 1 }}
                            >
                                <AppText
                                    style={styles.fieldDisplay}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {user?.name}
                                </AppText>
                            </ScrollView>
                        </View>
                    </View>

                    <Pressable
                        style={styles.profileField}
                        onPress={() => navigation.navigate("ChangePassword")}
                    >
                        <MaterialCommunityIcons name="lock-outline" size={spacing.xl} color="black" />
                        <View>
                            <AppText style={{ ...typography.body }}>Change Password</AppText>
                        </View>
                    </Pressable>
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
    editIcon: {
        position: "absolute",
        bottom: 20,
        right: 20,
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
    profileField: {
        flexDirection: "row",
        gap: spacing.md,
        alignItems: "center",
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: spacing.md,
    },
});
