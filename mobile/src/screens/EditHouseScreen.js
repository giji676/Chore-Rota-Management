import React, { useState, useEffect, useMemo } from "react";
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
import MemberLongPressModal from "../components/modals/MemberLongPressModal";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

export default function EditHouseScreen({ route, navigation }) {
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

    // member actions
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [memberModalVisible, setMemberModalVisible] = useState(false);

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

    const selectedMember = useMemo(
        () => house?.members?.find(m => m.id === selectedMemberId),
        [house, selectedMemberId]
    );

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
                console.log(err.response?.data || err.message);
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

            jsonLog("save house", data);

            const res = await api.put(`house/${house.id}/update/`, data);
            apiLogSuccess(res);

            navigation.goBack();
        } catch (err) {
            apiLogError(err);
            Alert.alert("Error", "Failed to save house");
        }
    };

    const handleDeleteMember = async () => {
        try {
            const res = await api.delete(
                `house/${house.id}/member/${selectedMember.id}/delete/`,
                {
                    data: {
                        house_version: house.version,
                        member_version: selectedMember.version,
                    },
                }
            );
            apiLogSuccess(res);
        } catch (err) {
            apiLogError(err);
        } finally {
            setMemberModalVisible(false);
            fetchHouse();
        }
    };

    const renderMemberItem = ({ item }) => (
        <Pressable
            style={styles.memberRow}
            onLongPress={() => {
                setSelectedMemberId(item.id);
                setMemberModalVisible(true);
            }}
        >
            <Text>{item.label}</Text>
        </Pressable>
    );

    if (loading) {
        return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit House</Text>

            <TextInput
                style={styles.input}
                placeholder="House Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="New Password"
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={styles.input}
                placeholder="Max Members"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="numeric"
            />

            <TextInput
                style={styles.input}
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
                        {suggestions.map(item => (
                            <TouchableOpacity
                                key={item.place_id}
                                style={styles.suggestionItem}
                                onPress={() => handleSelectSuggestion(item)}
                            >
                                <Text>{item.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
            <Text style={styles.subtitle}>Members</Text>
            <FlatList
                data={house.members}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMemberItem}
            />

            <Button title="Save Changes" onPress={handleSave} />

            <MemberLongPressModal
                visible={memberModalVisible}
                member={selectedMember}
                onClose={() => setMemberModalVisible(false)}
                onEdit={() => console.log("edit member")}
                onDelete={handleDeleteMember}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    memberRow: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    suggestions: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        marginBottom: 10,
        maxHeight: 150,
        overflow: "hidden"
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
});
