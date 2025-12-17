import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Pressable, Alert, View, Text, Button, FlatList, StyleSheet, TextInput, Modal } from 'react-native';
import WheelPicker from "react-native-wheel-scrollview-picker";
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';

import api from '../utils/api';
import MonthCalendar from "../components/MonthCalendar";
import CheckBox from "../components/CheckBox";
import OccurrenceLongPressModal from "../components/modals/OccurrenceLongPressModal";
import CreateChoreModal from "../components/modals/CreateChoreModal";
import AssignChoreModal from "../components/modals/AssignChoreModal";

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

    const [expandedOccId, setExpandedOccId] = useState(null);

    const [currentMonth, setCurrentMonth] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );

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

    const goToPrevMonth = () => {
        setCurrentMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        );
    };

    const goToNextMonth = () => {
        setCurrentMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        );
    };

    return (
        <View style={styles.container}>
            <View>
                {house?.occurrences?.length > 0 ? (
                    <MonthCalendar
                        occurrences={house.occurrences}
                        selectedDay={displayDayKey}
                        onDayPress={setDisplayDayKey}
                        currentMonth={currentMonth}
                        onPrevMonth={goToPrevMonth}
                        onNextMonth={goToNextMonth}
                    />
                ) : (
                        <Text>NO OCCS</Text>
                    )}
            </View>

            <View style={{flex: 1}} />

            <View>
                {displayDay.map((occ, index) => (
                    <View key={occ.id}>
                        <Pressable
                            onPress={() => {
                                setExpandedOccId(prev =>
                                    prev === occ.id ? null : occ.id
                                );
                            }}
                            onLongPress={() => {
                                setSelectedOcc(occ);
                                setOccLongPressModalVisible(true);
                            }}
                            style={styles.choreDetail}
                        >
                            <View>
                                <View style={styles.row}>
                                    <View style={styles.textColumn}>
                                        <Text style={styles.choreName}>{occ.chore.name}</Text>
                                        <Text style={styles.dateText}>
                                            {new Date(occ.due_date).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </Text>
                                    </View>

                                    <CheckBox
                                        onPress={() => handleCheckOccurrence(occ)}
                                        checked={occ.completed}
                                        style={{ marginLeft: "auto" }}
                                    />
                                </View>

                                {expandedOccId === occ.id && (
                                    <Text style={styles.description}>
                                        {occ.chore.description}
                                    </Text>
                                )}
                            </View>
                        </Pressable>

                        {index < displayDay.length - 1 && (
                            <View style={styles.divider} />
                        )}
                    </View>
                ))}

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

            {/* Occurrence Long Press Modal */}
            <OccurrenceLongPressModal
                visible={occLongPressModalVisible}
                occurrence={selectedOcc}
                onClose={() => setOccLongPressModalVisible(false)}
                onEdit={handleEditOccurrence}
                onDelete={handleDeleteOccurrence}
            />

            {/* Create Chore Modal */}
            <CreateChoreModal
                visible={choreModalVisible}
                onClose={() => setChoreModalVisible(false)}
                onCreate={handleCreateChore}
                choreName={newChoreName}
                setChoreName={setNewChoreName}
                choreDescription={newChoreDescription}
                setChoreDescription={setNewChoreDescription}
                choreColor={newChoreColor}
                setChoreColor={setNewChoreColor}
            />

            {/* Assign Chore Modal */}
            <AssignChoreModal
                visible={assignModalVisible}
                onClose={() => setAssignModalVisible(false)}
                onAssign={handleAssignChore}
                chores={house?.chores || []}
                members={house?.members || []}
                selectedChore={selectedChore}
                setSelectedChore={setSelectedChore}
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
    joinCode: { fontSize: 16, marginBottom: 20 },
    subTitle: { fontSize: 18, marginBottom: 10 },
    member: { fontSize: 16, marginBottom: 5 },
    buttonContainer: { marginTop: 20 },
    error: { color: "red", textAlign: "center", marginTop: 20 },
    choreDetail: {
        padding: 5,
        paddingRight: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    markCompleteContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 5,
    },
    divider: {
        height: 1.5,
        backgroundColor: "#ddd",
        marginVertical: 5,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    textColumn: {
        flexDirection: "column",
        flexShrink: 1,
    },
    choreName: {
        fontSize: 22,
        fontWeight: "500",
    },
    dateText: {
        color: "#666",
    },
    description: {
        marginTop: 6,
        color: "#666",
        fontSize: 14,
    },
});
