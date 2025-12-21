import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, PanResponder, Animated } from "react-native";

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
}

function createCircularList(values) {
    let head = new Node(values[0]);
    let current = head;
    for (let i = 1; i < values.length; i++) {
        const node = new Node(values[i]);
        current.next = node;
        node.prev = current;
        current = node;
    }
    current.next = head;
    head.prev = current;
    return head;
}

export default function InfiniteScroller({
    inputArray,
    initialIndex,
    onItemChange,
    itemHeight = 50,
    visibleCount = 5,
    buffer = 2,
}) {
    if (!inputArray || inputArray.length === 0) return null;
    const containerHeight = itemHeight * visibleCount;

    const [isActive, setIsActive] = useState(false);

    const listHead = useRef(createCircularList(inputArray)).current;
    const totalRender = visibleCount + 2 * buffer;

    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollOffset = useRef(0);
    const lastDy = useRef(0);
    const lastValue = useRef(null);

    const centerIndex = Math.floor(visibleCount / 2);
    const centerOffset = buffer + centerIndex;
    const [nodeMap, setNodeMap] = useState(() => {
        const map = [];
        let current = listHead;

        if (typeof initialIndex === "number" && initialIndex >= 0 && initialIndex < inputArray.length) {
            for (let i = 0; i < initialIndex; i++) {
                current = current.next;
            }
        }

        // Move BACKWARD by buffer + centerIndex to align center properly
        for (let i = 0; i < buffer + centerIndex; i++) {
            current = current.prev;
        }

        for (let i = 0; i < totalRender; i++) {
            map.push(current);
            current = current.next;
        }

        return map;
    });

    useEffect(() => {
        if (!onItemChange || nodeMap.length === 0) return;

        const value = nodeMap[centerOffset].value;
        if (value !== lastValue.current) {
            lastValue.current = value;
            onItemChange(value);
        }
    }, [nodeMap]);

    const shiftNodesUp = () => {
        setNodeMap(prev => {
            const newMap = prev.slice(1);
            newMap.push(prev[prev.length - 1].next);
            return newMap;
        });
    };

    const shiftNodesDown = () => {
        setNodeMap(prev => {
            return [prev[0].prev, ...prev.slice(0, -1)];
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: () => {
                lastDy.current = 0;
                setIsActive(true);
            },

            onPanResponderMove: (_, gestureState) => {
                const delta = gestureState.dy - lastDy.current;
                lastDy.current = gestureState.dy;

                scrollOffset.current += delta;

                while (scrollOffset.current >= itemHeight) {
                    scrollOffset.current -= itemHeight;
                    shiftNodesDown();
                }
                while (scrollOffset.current <= -itemHeight) {
                    scrollOffset.current += itemHeight;
                    shiftNodesUp();
                }

                scrollY.setValue(scrollOffset.current);
            },

            onPanResponderRelease: () => {
                // Snap to nearest item
                Animated.timing(scrollY, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }).start(() => {
                        scrollOffset.current = 0;
                        lastDy.current = 0;
                        setIsActive(false);
                    });
            },
        })
    ).current;

    return (
        <View style={[styles.container, { height: containerHeight }]} {...panResponder.panHandlers}>
            <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
                {nodeMap.map((node, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.item,
                            { height: itemHeight },
                            idx === centerOffset && styles.centerItem,
                        ]}
                    >
                        <Text
                            style={[
                                idx === centerOffset ? styles.centerText : styles.text,
                                isActive && styles.activeText,
                                idx === centerOffset && isActive && styles.activeCenterText,
                            ]}
                        >
                            {node.value}
                        </Text>
                    </View>
                ))}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "#ddd",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    item: {
        justifyContent: "center",
        alignItems: "center",
    },
    centerItem: {
        // borderWidth: 1,
        // borderColor: "#007bff",
    },
    text: {
        fontSize: 18,
        color: "#444",
        opacity: 0.6,
    },
    centerText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#007bff",
    },
    activeText: {
        color: "#888",
        opacity: 1,
    },
    activeCenterText: {
        color: "#0057ff",
        opacity: 1,
    },
});
