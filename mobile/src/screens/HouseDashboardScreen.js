import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Pressable, Alert, View, Text, Button, StyleSheet, TextInput, Modal } from 'react-native';
import WheelPicker from "react-native-wheel-scrollview-picker";
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';
import { useActionSheet } from "@expo/react-native-action-sheet";

import api from '../utils/api';
import { apiLogSuccess, apiLogError, jsonLog } from "../utils/loggers";
import MonthCalendar from "../components/MonthCalendar";
import CheckBox from "../components/CheckBox";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function HouseDashboardScreen({ navigation, route }) {
    const { showActionSheetWithOptions } = useActionSheet();

    const presetColors = [
        "#ff0000", "#00ff00", "#0000ff",
        "#ffff00", "#ff00ff", "#00ffff",
        "#000000", "#ffffff", "#ffa500",
        "#7600bc", "#a0a0a0", "#1f7d53"
    ];

    const [house, setHouse] = useState(route.params.house);
    const [error, setError] = useState('');
    const [displayDayKey, setDisplayDayKey] = useState();
    const [newChoreName, setNewChoreName] = useState('');
    const [newChoreDescription, setNewChoreDescription] = useState('');
    const [newChoreColor, setNewChoreColor] = useState(presetColors[0]);

    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState('mon');
    const [selectedHour, setSelectedHour] = useState(12);
    const [selectedMinute, setSelectedMinute] = useState(30);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedChore, setSelectedChore] = useState();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [repeatDelta, setRepeatDelta] = useState({days: 7});
    const [newCompleted, setNewCompleted] = useState();

    const [selectedOcc, setSelectedOcc] = useState();

    const [occurrenceEditModalVisible, setOccurrenceEditModalVisible] = useState(false);

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
                    const res = await api.post("accounts/push-token/", { token });
                }
            } catch (err) {
                apiLogError(err);
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

    const handleCheckOccurrence = async (occ) => {
        await api.patch(`occurrences/${occ.id}/update/`, {
            "occurrence_version": occ.version,
            completed: !occ.completed 
        });
        fetchHouse();
    };

    const handleDeleteOccurrence = async (occ) => {
        Alert.alert(
            "Confirm Delete",
            "Confirm aciton",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Only This",
                    style: "destructive",
                    onPress: async () => {
                        const data = {
                            "occurrence_version": occ.version,
                            "generate_occurrences": true
                        };
                        try {
                            const res = await api.delete(`occurrences/${occ.id}/delete/`, {data: data});
                            Alert.alert("Chore deleted successfully");
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.error || err.message);
                        } finally {
                            fetchHouse();
                        }
                    }
                },
                {
                    text: "Delete All Futures",
                    style: "destructive",
                    onPress: async () => {
                        const data = {
                            "occurrence_version": occ.version,
                            "generate_occurrences": false
                        };
                        try {
                            const res = await api.delete(`occurrences/${occ.id}/delete/`, {data: data});
                            Alert.alert("All chores deleted successfully");
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

    const handleEditOccurrence = async (occ) => {
        const schedule = house.schedules.find(s => s.id === occ.schedule);
        const data = {
            house_id: house.id,
            chore_id: occ.chore.id,
            schedule_id: occ.schedule,
            occurrence_id: occ.id,
            assignee_id: selectedMember.id,

            house_version: house.version,
            chore_version: occ.chore.version,
            schedule_version: schedule.version,
            occurrence_version: occ.version,

            chore_name: newChoreName,
            chore_description: newChoreDescription,
            chore_color: newChoreColor,
            chore_color: newChoreColor,

            repeat_delta: repeatDelta,
            start_date: selectedDate.toISOString(),
        }
        try {
            const res = await api.post("chores/occurrence/update/", data);
            fetchHouse();
            setOccurrenceEditModalVisible(false);
            // apiLogSuccess(res);
        } catch (err) {
            apiLogError(err);
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

    const handleOccurrenceLongPress = (occ) => {
        const options = ["Edit Chore", "Delete", "Cancel"];
        const cancelButtonIndex = 2;
        const destructiveButtonIndex = 1;

        showActionSheetWithOptions({
            options,
            cancelButtonIndex,
            destructiveButtonIndex,
            title: occ.chore.name,
        }, buttonIndex => {
                if (buttonIndex === 0){
                    navigation.navigate("EditChore", { house, occurrence: occ });
                } else if( buttonIndex=== 1){
                    handleDeleteOccurrence(occ);
                }
            });
    };

    return (
        <View style={styles.container}>
            <View>
                <MonthCalendar
                    occurrences={house.occurrences}
                    selectedDay={displayDayKey}
                    onDayPress={setDisplayDayKey}
                    currentMonth={currentMonth}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                />
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
                            onLongPress={() => {handleOccurrenceLongPress(occ)}}
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
                    <Button title="Create & Assign Chore" onPress={() => 
                        navigation.navigate("EditChore", { house })
                    }/>
                </View>
            </View>
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
