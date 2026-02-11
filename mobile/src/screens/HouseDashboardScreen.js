import { useEffect, useState, useRef, useMemo } from 'react';
import { 
    Pressable,
    Alert,
    View,
    Text,
    Button,
    StyleSheet,
    Modal,
    PanResponder,
    Animated,
    LayoutAnimation,
} from 'react-native';
import WheelPicker from "react-native-wheel-scrollview-picker";
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';
import { useActionSheet } from "@expo/react-native-action-sheet";

import api from '../utils/api';
import { apiLogSuccess, apiLogError, jsonLog } from "../utils/loggers";
import MonthCalendar from "../components/MonthCalendar";
import CheckBox from "../components/CheckBox";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppButton from "../components/AppButton";

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
    const [displayDayKey, setDisplayDayKey] = useState(new Date().toISOString().split("T")[0]);
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
    const [choreFilter, setChoreFilter] = useState("all"); 
    // const currentUserId = route.params?.userId;
    const currentUserId = 15;

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

    // TODO: Check selectedDate is being set correctly?
    // TODO: Move to EditChoreScreen
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

    const filteredOccurrences = useMemo(() => {
        if (!house?.occurrences) return [];

        if (choreFilter === "all") {
            return house.occurrences;
        }

        return house.occurrences.filter(
            occ => occ.user.id === currentUserId
        );
    }, [house, choreFilter, currentUserId]);

    const occurrencesByDate = useMemo(() => {
        const map = {};

        filteredOccurrences.forEach((occ) => {
            const key = new Date(occ.due_date).toISOString().split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(occ);
        });

        return map;
    }, [filteredOccurrences]);

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

    const getDueTime = (occ) => new Date(occ.due_date).getTime();

    const orderedOccurrences = useMemo(() => {
        if (!displayDay) return [];

        const uncompleted = displayDay
        .filter(occ => !occ.completed)
        .sort((a, b) => getDueTime(a) - getDueTime(b));

        const completed = displayDay
        .filter(occ => occ.completed)
        .sort((a, b) => getDueTime(a) - getDueTime(b));

        return [...uncompleted, ...completed];
    }, [displayDay]);

    const onGrantRef = useRef(null);
    const onMoveRef = useRef(null);
    const onReleaseRef = useRef(null);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dy) > 10 &&
                Math.abs(g.dy) > Math.abs(g.dx),

            onPanResponderGrant: (_, g) => {
                onGrantRef.current?.(g);
            },

            onPanResponderMove: (_, g) => {
                onMoveRef.current?.(g);
            },

            onPanResponderRelease: (_, g) => {
                onReleaseRef.current?.(g);
            },
        })
    ).current;

    const toggleExpanded = (occId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedOccId(prev => (prev === occId ? null : occId));
    };

    return (
        <View 
            {...panResponder.panHandlers}
            style={styles.container}
        >

            <View style={styles.calendarContainer}>
                <MonthCalendar
                    occurrences={filteredOccurrences}
                    selectedDay={displayDayKey}
                    onDayPress={setDisplayDayKey}
                    currentMonth={currentMonth}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                    onGrant={(fn) => { onGrantRef.current = fn; }}
                    onMove={(fn) => { onMoveRef.current = fn; }}
                    onRelease={(fn) => { onReleaseRef.current = fn; }}
                />
            </View>

            <View style={styles.choreView}>
                <View style={styles.filterRow}>
                    <AppText style={styles.choreViewTitle}>
                        {new Date(displayDayKey).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                        })}
                    </AppText>

                    <View style={styles.filterRowRight}>
                        <Pressable
                            onPress={() => setChoreFilter("all")}
                            style={[
                                styles.filterPill,
                                choreFilter === "all" && styles.filterPillActive,
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.filterText,
                                    choreFilter === "all" && styles.filterTextActive,
                                ]}
                            >
                                All
                            </AppText>
                        </Pressable>

                        <Pressable
                            onPress={() => setChoreFilter("mine")}
                            style={[
                                styles.filterPill,
                                choreFilter === "mine" && styles.filterPillActive,
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.filterText,
                                    choreFilter === "mine" && styles.filterTextActive,
                                ]}
                            >
                                My chores
                            </AppText>
                        </Pressable>
                    </View>
                </View>
                {orderedOccurrences.map((occ, index) => (
                    <View key={occ.id}>
                        <Pressable
                            onPress={() => toggleExpanded(occ.id)}
                            onLongPress={() => {handleOccurrenceLongPress(occ)}}
                            style={styles.choreDetail}
                        >
                            <View>
                                <View style={styles.row}>
                                    <View 
                                        style={[
                                            styles.choreBar,
                                            {
                                                backgroundColor: occ.chore?.color || DEFAULT_COLOR,
                                                opacity: occ.completed ? 0.4 : 1,
                                            },
                                        ]}
                                    >
                                    </View>
                                    <View style={styles.textColumn}>
                                        <View style={{ 
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: spacing.sm,
                                        }}>
                                            <AppText style={styles.choreName}>{occ.chore.name}</AppText>
                                            <AppText>-</AppText>
                                            <AppText>{occ.user_label}</AppText>
                                        </View>
                                        <AppText style={styles.dateText}>
                                            {new Date(occ.due_date).toLocaleString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </AppText>
                                    </View>
                                    <CheckBox
                                        onPress={() => handleCheckOccurrence(occ)}
                                        checked={occ.completed}
                                        style={{ marginLeft: "auto" }}
                                    />
                                </View>

                                {expandedOccId === occ.id && (
                                    <AppText style={styles.description}>
                                        {occ.chore.description}
                                    </AppText>
                                )}
                            </View>
                        </Pressable>

                        {/* {index < displayDay.length - 1 && ( */}
                        {/*     <View style={styles.divider} /> */}
                        {/* )} */}
                    </View>
                ))}
            </View>

            <AppButton
                title="Create Chore"
                onPress={() => navigation.navigate("EditChore", { house })}
                style={{ margin: spacing.lg }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    calendarContainer: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    choreView: {
        flex: 1,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    choreDetail: {
        padding: spacing.sm,
        paddingRight: spacing.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: spacing.md,
    },
    divider: {
        height: 1.5,
        backgroundColor: colors.divider,
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
        ...typography.h3,
    },
    dateText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    description: {
        color: "#666",
        ...typography.small,
    },
    choreBar: {
        width: 6,
        height: "80%",
        borderRadius: 3,
        marginRight: spacing.md,
    },
    choreViewTitle: {
        ...typography.h2,
    },
    filterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterRowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 50,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterPillActive: {
        backgroundColor: colors.accentSurface,
        borderColor: colors.accentBorder,
    },
    filterText: {
        color: colors.textSecondary,
        ...typography.small,
    },
    filterTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
});
