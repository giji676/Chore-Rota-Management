import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    Modal,
    Button,
    Animated,
    StyleSheet,
    PanResponder,
    TouchableOpacity,
} from "react-native";

import InfiniteScroller from "../InfiniteScroller";

const ITEM_HEIGHT = 40;
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function DayPicker({selectedDate, setSelectedDate}) {
    const todaysDate = new Date();

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    const selectedMonthStr = selectedDate.toLocaleString("default", {
        month: "long",
    });

    const [scrollView, setScrollView] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;

    const monthDays = useMemo(() => {
        let days = [];
        const firstDate = new Date(selectedYear, selectedMonth, 1);
        const lastDate = new Date(selectedYear, selectedMonth + 1, 0);

        let startDay = firstDate.getDay();
        if (startDay === 0) startDay = 7;
        const emptyBefore = startDay - 1;

        for (let i = 0; i < emptyBefore; i++) days.push(null);
        for (let d = 1; d <= lastDate.getDate(); d++) {
            days.push(new Date(selectedYear, selectedMonth, d));
        }

        return days;
    }, [selectedYear, selectedMonth]);

    const rows = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        rows.push(monthDays.slice(i, i + 7));
    }

    const handleViewToggle = () => {
        setScrollView(prev => !prev);
    }

    const currentYear = todaysDate.getFullYear();
    const startYear = currentYear - 100;
    const endYear = currentYear + 100;

    const yearsArray = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
    );
    const monthsArray = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <Modal>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View>
                        <View>
                            <TouchableOpacity
                                style={styles.titleRow}
                                onPress={handleViewToggle}
                            >
                                <Text style={styles.title}>
                                    {selectedMonthStr} {selectedYear}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View>
                        {scrollView ? (
                            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                                <InfiniteScroller
                                    inputArray={daysArray}
                                    initialIndex={selectedDay - 1}
                                    // visibleCount={3}
                                    onItemChange={(value) =>
                                        setSelectedDate(new Date(selectedYear, selectedMonth, value))
                                    }
                                />
                                <InfiniteScroller
                                    inputArray={monthsArray}
                                    initialIndex={selectedMonth}
                                    // visibleCount={3}
                                    onItemChange={(value) =>
                                        setSelectedDate(new Date(
                                            selectedYear, monthsArray.indexOf(value), selectedDay))
                                    }
                                />
                                <InfiniteScroller
                                    inputArray={yearsArray}
                                    initialIndex={yearsArray.indexOf(selectedYear)}
                                    // visibleCount={3}
                                    onItemChange={(value) =>
                                        setSelectedDate(new Date(value, selectedMonth, selectedDay))
                                    }
                                />
                            </View>
                        ) : (
                                rows.map((week, rowIndex) => (
                                    <View key={rowIndex} style={styles.weekRow}>
                                        {week.map((date, col) => {
                                            if (!date) {
                                                return <View key={col} style={styles.dayCell} />;
                                            }
                                            const key = date.toISOString().split("T")[0];
                                            const isSelected = date.getDate() === selectedDay;
                                            const isToday = key === todaysDate.toISOString().split("T")[0];

                                            return (
                                                <TouchableOpacity
                                                    key={key}
                                                    onPress={() => {
                                                        setSelectedDate(date);
                                                    }}
                                                    style={[
                                                        styles.dayCell,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dayText,
                                                            isSelected && styles.selectedCell,
                                                            isToday && styles.todaysCell,
                                                        ]}
                                                    >
                                                        {date.getDate()}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))
                            )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const wheelStyle = StyleSheet.create({
    container: {
        height: ITEM_HEIGHT * 5,
        width: 80,
        alignItems: "center",
    },
    item: {
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    indicator: {
        position: "absolute",
        top: ITEM_HEIGHT * 2,
        height: ITEM_HEIGHT,
        width: "100%",
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "80%",
        maxWidth: 400,
        flexShrink: 0,
        backgroundColor: "#fff",
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
    },
    weekRow: {
        flexDirection: "row",
    },
    dayCell: {
        width: `${100 / 7}%`,
        alignItems: "center",
    },
    dayText: {
        borderWidth: 1,
        borderColor: "transparent",
    },
    todaysCell: {
        backgroundColor: "#666",
        color: "#fff",
    },
    selectedCell: {
        borderColor: "#444",
    },
});
