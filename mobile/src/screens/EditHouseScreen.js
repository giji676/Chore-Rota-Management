import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Pressable,
    ScrollView,
    Alert,
} from "react-native";

import api from "../utils/api";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

export default function EditHouseScreen({ route, navigation }) {
    const { showActionSheetWithOptions } = useActionSheet();

    const { houseId } = route.params;

    const [house, setHouse] = useState(null);
    const [loading, setLoading] = useState(true);

    // house fields
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [address, setAddress] = useState("");
    const [placeId, setPlaceId] = useState("");
    const [maxMembers, setMaxMembers] = useState("6");

    // address autocomplete
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const ROLE_LABELS = {
        owner: "Admin",
        member: "Member",
    };

    const fetchHouse = async () => {
        try {
            const res = await api.get(`house/${houseId}/`);
            setHouse(res.data);

            setName(res.data.name);
            setAddress(res.data.address || "");
            setPlaceId(res.data.place_id || "");
            setMaxMembers(res.data.max_members.toString());
        } catch (err) {
            apiLogError(err);
            Alert.alert("Error", "Failed to load house");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHouse();
    }, []);

    useEffect(() => {
        if (address.length < 2) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                const res = await api.get(
                    `/address-autocomplete/?q=${encodeURIComponent(address)}`
                );
                setSuggestions(res.data.predictions);
            } catch (err) {
                console.log("Error fetching address suggestions:", err.response?.data || err.message);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        const timeout = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeout);
    }, [address]);

    const handleSelectSuggestion = (item) => {
        setAddress(item.description);
        setPlaceId(item.place_id);
        setSuggestions([]);
    };

    const handleSave = async () => {
        try {
            const data = {
                name,
                password,
                address,
                place_id: placeId,
                max_members: parseInt(maxMembers),
                house_version: house.version,
            };

            const res = await api.patch(`house/${house.id}/update/`, data);
            apiLogSuccess(res);

            navigation.goBack();
        } catch (err) {
            apiLogError(err);
            Alert.alert("Error", "Failed to save house");
        }
    };

    const handleDeleteMember = async (member) => {
        Alert.alert(
            "Confirm Remove",
            "Are you sure you want to remove this member?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.delete(
                                `house/${house.id}/member/${member.id}/delete/`,
                                {
                                    data: {
                                        house_version: house.version,
                                        member_version: member.version,
                                    },
                                }
                            );
                            Alert.alert("Member removed successfully");
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.error || err.message);
                        } finally {
                            fetchHouse();
                        }
                    }
                }
            ]
        );
    };

    const renderMemberItem = ({ item, index }) => (
        <View>
            <Pressable
                style={styles.memberRow}
                onLongPress={() => handleMemberOptions(item)}
            >
                <AppText>
                    {item.label} • {ROLE_LABELS[item.role]}
                </AppText>
            </Pressable>

            {index < house.members.length - 1 && <View style={styles.divider} />}
        </View>
    );

    if (loading) {
        return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
    }

    const handleMemberOptions = (member) => {
        if (!member) return;

        const options = ["Change Role", "Remove Member", "Cancel"];
        const cancelButtonIndex = 2;
        const destructiveButtonIndex = 1;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                title: member.label ?? "Member",
            },
            (buttonIndex) => {
                if (buttonIndex === cancelButtonIndex) return;

                if (buttonIndex === 0) {
                    // Defer the role sheet so outer sheet closes first
                    setTimeout(() => showRoleActionSheet(member), 0);
                } else if (buttonIndex === 1) {
                    handleDeleteMember(member);
                }
            }
        );
    };

    const showRoleActionSheet = (member) => {
        const roleOptions = ["Admin", "Member", "Cancel"];
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
            {
                options: roleOptions,
                cancelButtonIndex,
                title: `Change role for ${member.label}`,
            },
            async (buttonIndex) => {
                if (buttonIndex === cancelButtonIndex) return;

                console.log("Selected role index:", buttonIndex);

                const roleMap = {
                    0: "owner", // Admin
                    1: "member",
                };

                try {
                    await api.patch(
                        `house/${house.id}/member/${member.id}/update/`,
                        {
                            role: roleMap[buttonIndex],
                            member_version: member.version,
                        }
                    );
                    fetchHouse();
                } catch (err) {
                    apiLogError(err);
                    Alert.alert("Error", "Failed to update role");
                }
            }
        );
    };

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>Edit House</AppText>
            <View style={{ gap: spacing.md }}>
                <AppTextInput
                    placeholder="House Name"
                    value={name}
                    onChangeText={setName}
                />

                <AppTextInput
                    placeholder="New Password"
                    value={password}
                    onChangeText={setPassword}
                />

                <AppTextInput
                    placeholder="Max Members"
                    value={maxMembers}
                    onChangeText={setMaxMembers}
                    keyboardType="numeric"
                />

                <AppTextInput
                    placeholder="Address"
                    value={address}
                    onChangeText={(text) => {
                        setAddress(text);
                        setPlaceId("");
                    }}
                />

                {loadingSuggestions && <ActivityIndicator size="small" />}
                {suggestions.length > 0 && (
                    <View style={styles.suggestions}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {suggestions.map((item, index) => (
                                <View key={item.place_id}>
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSelectSuggestion(item)}
                                    >
                                        <AppText>{item.description}</AppText>
                                    </TouchableOpacity>

                                    {index < suggestions.length - 1 && (
                                        <View style={styles.divider} />
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
            <AppText style={styles.subTitle}>Members</AppText>
            <FlatList
                data={house?.members}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMemberItem}
            />

            <AppButton
                title="Save Changes"
                onPress={handleSave}
            />
        </View>
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
    memberRow: {
        padding: spacing.sm,
    },
    suggestions: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.raisedSurface,
        borderRadius: 8,
        maxHeight: 150,
        overflow: "hidden"
    },
    suggestionItem: {
        padding: spacing.sm,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.xs,
    },
});
