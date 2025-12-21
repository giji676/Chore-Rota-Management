import React, { useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    PanResponder
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_COLOR = "#3498db";
const SWIPE_THRESHOLD = 50;

export default function MonthCalendar({
    occurrences,
    selectedDay,
    onDayPress,
    currentMonth,
    onPrevMonth,
    onNextMonth,
}) {

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthYearLabel = currentMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
    const currentDate = new Date().getDate();

    /* SWIPE HANDLER */
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,

            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dx) > 10 &&
                    Math.abs(gesture.dx) > Math.abs(gesture.dy),

            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    onPrevMonth();
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    onNextMonth();
                }
            },
        })
    ).current;

    /* MONTH DAYS */
    const monthDays = useMemo(() => {
        let days = [];
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);

        let startDay = first.getDay();
        if (startDay === 0) startDay = 7;
        const emptyBefore = startDay - 1;

        for (let i = 0; i < emptyBefore; i++) days.push(null);
        for (let d = 1; d <= last.getDate(); d++) {
            days.push(new Date(year, month, d));
        }

        return days;
    }, [year, month]);

    /*  OCCURRENCES MAP  */
    const occByDate = useMemo(() => {
        const map = {};
        if (!occurrences) return {};
        occurrences.forEach((occ) => {
            const d = new Date(occ.due_date);
            if (d.getMonth() !== month || d.getFullYear() !== year) return;
            const key = d.toISOString().split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(occ);
        });
        return map;
    }, [occurrences, month, year]);

    const rows = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        rows.push(monthDays.slice(i, i + 7));
    }

    return (
        <View>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.arrow} onPress={onPrevMonth}>
                    <Ionicons name="chevron-back" size={28} />
                </TouchableOpacity>

                <Text style={styles.monthHeader}>{monthYearLabel}</Text>

                <TouchableOpacity style={styles.arrow} onPress={onNextMonth}>
                    <Ionicons name="chevron-forward" size={28} />
                </TouchableOpacity>
            </View>
            <View {...panResponder.panHandlers}>
                {/* CALENDAR */}
                {rows.map((week, rowIndex) => (
                    <View key={rowIndex} style={styles.weekRow}>
                        {week.map((date, colIndex) => {
                            if (!date) {
                                return <View key={colIndex} style={styles.dayCell} />;
                            }

                            const key = date.toISOString().split("T")[0];
                            const occs = occByDate[key] || [];
                            const isSelected = key === selectedDay;
                            const isToday = key === new Date().toISOString().split("T")[0];

                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.dayCell,
                                        isSelected && styles.dayCellSelected,
                                    ]}
                                    onPress={() => onDayPress(key)}
                                >
                                    <Text style={[
                                        styles.dateNumber,
                                        isToday && styles.todaysCell,
                                    ]}>
                                        {date.getDate()}
                                    </Text>

                                    {occs.map((occ) => (
                                        <View
                                            key={occ.id}
                                            style={[
                                                styles.choreBar,
                                                {
                                                    backgroundColor: occ.chore?.color || DEFAULT_COLOR,
                                                    opacity: occ.completed ? 0.4 : 1,
                                                },
                                            ]}
                                        />
                                    ))}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    arrow: {
        width: 40,
        alignItems: "center",
    },
    monthHeader: {
        flex: 1,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold",
    },
    weekRow: {
        flexDirection: "row",
    },
    dayHeader: {
        flex: 1,
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: 5,
    },
    dayCell: {
        width: `${100 / 7}%`,
        minHeight: 36,
        padding: 4,
        alignItems: "center",
    },
    dayCellSelected: {
        borderWidth: 1,
        borderColor: "#aaa",
        backgroundColor: "#eee",
        borderRadius: 6,
    },
    dateNumber: {
        fontWeight: "600",
        marginBottom: 4,
    },
    choreBar: {
        width: "100%",
        height: 6,
        borderRadius: 3,
        marginVertical: 2,
    },
    todaysCell: {
        backgroundColor: "#666",
        color: "#fff",
        borderRadius: 4,
        paddingHorizontal: 3,
    },
});
