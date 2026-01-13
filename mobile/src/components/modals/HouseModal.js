import React, { useState, useEffect } from "react";
import {
    ScrollView,
    View,
    Text,
    Modal,
    TextInput,
    Button,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Pressable,
} from "react-native";
import MemberLongPressModal from "./MemberLongPressModal";
import api from "../../utils/api";
import { jsonLog } from "../../utils/loggers";

export default function HouseModal({
    visible,
    house,
    action,
    onClose,
    onSave,
    newName,
    setNewName,
    newPassword,
    setNewPassword,
    newAddress,
    setNewAddress,
    newPlaceId,
    setNewPlaceId,
    newMaxMembers,
    setNewMaxMembers,
    fetchHouses,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [address, setAddress] = useState(newAddress || "");
    const [memberLongPressModalVisible, setMemberLongPressModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState();

    const renderMemberItem = ({ item }) => {
        return (
            <Pressable
                onLongPress={() => {
                    setSelectedMember(item);
                    setMemberLongPressModalVisible(true);
                }}
                style={styles.memberRow}
                key={item?.id}
            >
                <Text>{item?.label}</Text>
            </Pressable>
        );
    }

    useEffect(() => {
        if (address.length < 2) {
            setSuggestions([]);
            return;
        }

        if (newAddress && address === newAddress.description) {
            return;
        }

        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                const res = await api.get(`/address-autocomplete/?q=${encodeURIComponent(address)}`);
                setSuggestions(res.data.predictions);
            } catch (err) {
                console.log(err.response?.data || err.message);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        const delayDebounce = setTimeout(fetchSuggestions, 300); // debounce
        return () => clearTimeout(delayDebounce);
    }, [address]);

    const handleSelectSuggestion = (item) => {
        setAddress(item.description);
        setNewPlaceId(item.place_id);
        setNewAddress(item.description);
        setSuggestions([]);
    };

    const handleEditMember = async () => {
        console.log("Editing member:", selectedMember);
    };

    const handleDeleteMember = async () => {
        try {
            const res = await api.delete(`house/${house.id}/member/${selectedMember.id}/delete/`,
                {data: {
                    "house_version": house.version,
                    "member_version": selectedMember.version,
                }});
            apiLogSuccess(res);
        } catch (err) {
            apiLogError(err);
        } finally {
            fetchHouses();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>{`${action === "create" ? "Create New" : "Edit"} House`}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="House Name"
                        placeholderTextColor="gray"
                        value={newName}
                        onChangeText={setNewName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        placeholderTextColor="gray"
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Max Members"
                        placeholderTextColor="gray"
                        value={newMaxMembers}
                        onChangeText={setNewMaxMembers}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Address"
                        placeholderTextColor="gray"
                        value={newAddress}
                        onChangeText={text => {
                            setAddress(text);
                            setNewPlaceId("");
                        }}
                    />

                    {loadingSuggestions && <ActivityIndicator size="small" />}
                    {suggestions.length > 0 && (
                        <ScrollView style={styles.suggestionsList}>
                            {suggestions.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(item)}
                                >
                                    <Text>{item.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    {house?.members && (
                        <FlatList
                            data={house.members}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderMemberItem}
                        />
                    )}

                    <MemberLongPressModal
                        visible={memberLongPressModalVisible}
                        member={selectedMember}
                        onClose={() => { setMemberLongPressModalVisible(false); }}
                        onEdit={() => {handleEditMember()}}
                        onDelete={() => {handleDeleteMember()}}
                    />
                    <View style={styles.buttons}>
                        <Button title="Cancel" onPress={onClose} />
                        <Button title="Save" onPress={() => onSave(house)} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "85%",
        maxWidth: 400,
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        borderRadius: 16,
        flexShrink: 0,
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 10,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    memberRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 5,
        backgroundColor: "#f9f9f9",
        marginVertical: 2,
    },
    suggestionsList: {
        borderWidth: 1,
        borderColor: "#ccc",
        maxHeight: 150,
        marginBottom: 10,
        borderRadius: 8,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
});
