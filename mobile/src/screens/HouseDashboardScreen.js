import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Pressable, Alert, View, Text, Button, FlatList, StyleSheet, TextInput, Modal } from 'react-native';
import WheelPicker from "react-native-wheel-scrollview-picker";
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';

import api from '../utils/api';
import WeekCalendar from "../components/WeekCalendar";
import CheckBox from "../components/CheckBox";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function HouseDashboardScreen({ navigation, route }) {
    const [house, setHouse] = useState(route.params.house);
    const [error, setError] = useState('');
    const [displayDayKey, setDisplayDayKey] = useState();
    const [choreModalVisible, setChoreModalVisible] = useState(false);
    const [newChoreName, setNewChoreName] = useState('');
    const [newChoreDescription, setNewChoreDescription] = useState('');
    const [newChoreColor, setNewChoreColor] = useState('#ffffff');

    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState('mon');
    const [selectedHour, setSelectedHour] = useState(12);
    const [selectedMinute, setSelectedMinute] = useState(30);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedChore, setSelectedChore] = useState();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [repeatDelta, setRepeatDelta] = useState({days: 7});

    const [occLongPressModalVisible, setOccLongPressModalVisible] = useState(false);
    const [selectedOcc, setSelectedOcc] = useState();

    const hours = [...Array(24).keys()].map(n => n.toString().padStart(2, "0"));
    const minutes = [...Array(60).keys()].map(n => n.toString().padStart(2, "0"));

    useEffect(() => {
        async function initNotifications() {
            try {
                await configureAndroidChannel();
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    await api.post("accounts/push-token/", { token });
                }
            } catch (err) {
                console.log("Notification init error:", err);
            }
        }
        initNotifications();
    }, []);

    useEffect(() => {
        if (!house) return;
        fetchHouse();
    }, []);

    useEffect(() => {
        if (assignModalVisible && house) {
            if (!selectedChore && house.chores.length > 0) setSelectedChore(house.chores[0].id);
            if (!selectedMember && house.members.length > 0) setSelectedMember(house.members[0].id);
        }
    }, [assignModalVisible, house]);

    const fetchHouse = async () => {
        try {
            const res = await api.get(`house/${house.id}/details/`);
            setHouse(res.data);
        } catch (err) {
            setError("Failed to fetch house");
        }
    };

    const handleDeleteHouse = async () => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this house? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`house/${house.id}/`);
                            Alert.alert("House deleted successfully");
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.error || err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleCheckOccurrence = async (occ) => {
        await api.patch(`occurrences/${occ.id}/update/`, { completed: !occ.completed });
        fetchHouse();
    };

    const handleDeleteOccurrence = async (occ) => {
        await api.delete(`occurrences/${occ.id}/delete/`);
        fetchHouse();
    };

    const handleEditOccurrence = async (occ) => {
    };

    const handleCreateChore = async () => {
        if (!newChoreName.trim()) {
            Alert.alert("Error", "Chore name is required");
            return;
        }
        try {
            await api.post("chores/create/", {
                house_id: house.id,
                name: newChoreName,
                description: newChoreDescription,
                color: newChoreColor,
            });
            fetchHouse();
            setChoreModalVisible(false);
            setNewChoreName('');
            setNewChoreDescription('');
            setNewChoreColor('#ffffff');
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const handleAssignChore = async () => {
        try {
            await api.post(`schedules/create/`, {
                chore_id: selectedChore,
                user_id: selectedMember,
                start_date: selectedDate,
                repeat_delta: repeatDelta
            });
            fetchHouse();
            setAssignModalVisible(false);
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const occurrencesByDate = useMemo(() => {
        if (!house?.occurrences) return {};

        const map = {};
        house.occurrences.forEach((occ) => {
            const key = new Date(occ.due_date).toISOString().split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(occ);
        });

        return map;
    }, [house]);

    const displayDay = displayDayKey
        ? occurrencesByDate[displayDayKey] || []
        : [];

    return (
        <View style={styles.container}>
            {house?.occurrences?.length > 0 ? (
                <WeekCalendar
                    occurrences={house.occurrences}
                    selectedDay={displayDayKey}
                    onDayPress={setDisplayDayKey}
                />
            ) : (
                    <Text>NO OCCS</Text>
                )}

            {displayDay?.length > 0 && (
                <>
                    <View style={styles.markCompleteContainer}>
                        <Text>Mark Complete</Text>
                    </View>
                    <View>
                        {displayDay.map((occ) => (
                            <Pressable
                                key={occ.id}
                                onLongPress={() => {
                                    setSelectedOcc(occ);
                                    setOccLongPressModalVisible(true);
                                }}
                                style={styles.choreDetail}
                            >
                                <Text>{occ.chore.name} - {new Date(occ.due_date).toLocaleString()}</Text>
                                <CheckBox
                                    onPress={() => handleCheckOccurrence(occ)}
                                    checked={occ.completed}
                                />
                            </Pressable>
                        ))}
                    </View>
                </>
            )}

            {/* Occurrence Long Press Modal */}
            <Modal
                visible={occLongPressModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOccLongPressModalVisible(false)}
            >
                <View style={styles.assModalBackground}>
                    <View style={styles.assModalContainer}>
                        <Pressable style={[styles.assModalButton, styles.deleteButton]} onPress={() => {
                            handleDeleteOccurrence(selectedOcc);
                            setOccLongPressModalVisible(false);
                            setSelectedOcc(null);
                        }}>
                            <Text style={styles.assModalButtonText}>Delete</Text>
                        </Pressable>
                        <Pressable style={styles.assModalButton} onPress={() =>
                            handleEditOccurrence(selectedOcc)
                        }>
                            <Text style={styles.assModalButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.assModalButton} onPress={() =>
                            setOccLongPressModalVisible(false)
                        }>
                            <Text style={styles.assModalButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Create Chore Modal */}
            <Modal
                visible={choreModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setChoreModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Create New Chore</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Chore Name"
                            placeholderTextColor="gray"
                            value={newChoreName}
                            onChangeText={setNewChoreName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            placeholderTextColor="gray"
                            value={newChoreDescription}
                            onChangeText={setNewChoreDescription}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Color (Hex)"
                            placeholderTextColor="gray"
                            value={newChoreColor}
                            onChangeText={setNewChoreColor}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setChoreModalVisible(false)} />
                            <Button title="Create" onPress={handleCreateChore} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assign Chore Modal */}
            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Assign Chore</Text>

                        {/* Chore Picker */}
                        <Text>Chore</Text>
                        <Picker
                            selectedValue={selectedChore}
                            onValueChange={(chore) => setSelectedChore(chore)}
                            style={styles.picker}
                        >
                            {house?.chores?.map((chore) => (
                                <Picker.Item key={chore.id} label={chore.name} value={chore.id} />
                            ))}
                        </Picker>

                        {/* Assignee Picker */}
                        <Text>Assign to</Text>
                        <Picker
                            selectedValue={selectedMember}
                            onValueChange={(memberId) => setSelectedMember(memberId)}
                            style={styles.picker}
                        >
                            {house?.members?.map(member => (
                                <Picker.Item
                                    key={member.id}
                                    label={member.username + (member.is_guest ? ' (Guest)' : '')}
                                    value={member.id}
                                />
                            ))}
                        </Picker>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setAssignModalVisible(false)} />
                            <Button title="Assign" onPress={handleAssignChore} />
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.buttonContainer}>
                <Button title="Create Chore" onPress={() => setChoreModalVisible(true)} />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Assign Chore" onPress={() => setAssignModalVisible(true)} />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Delete House" color="red" onPress={handleDeleteHouse} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    joinCode: { fontSize: 16, marginBottom: 20 },
    subTitle: { fontSize: 18, marginBottom: 10 },
    member: { fontSize: 16, marginBottom: 5 },
    buttonContainer: { marginTop: 20 },
    error: { color: 'red', textAlign: 'center', marginTop: 20 },
    choreDetail: { paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
    markCompleteContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 },
    modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 16 },
    assModalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    assModalContainer: { borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', padding: 10 },
    assModalButton: { padding: 12, backgroundColor: '#eee', marginBottom: 5, borderRadius: 8 },
    assModalButtonText: { fontWeight: 'bold', fontSize: 18 },
    picker: { color: '#444', backgroundColor: '#eee', fontWeight: 'bold', marginVertical: 5 }
});
