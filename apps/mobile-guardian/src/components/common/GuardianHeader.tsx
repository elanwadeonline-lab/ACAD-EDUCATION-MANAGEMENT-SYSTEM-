import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, Bell, Search } from "lucide-react-native";
import { Colors, Spacing, Typography } from "../../theme/tokens";

interface GuardianHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightType?: "none" | "bell" | "search";
  hasUnreadNotification?: boolean;
  onRightPress?: () => void;
}

export function GuardianHeader({
  title,
  showBack = true,
  onBack,
  rightType = "none",
  hasUnreadNotification = false,
  onRightPress,
}: GuardianHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color={Colors.ink} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.right}>
        {rightType === "bell" && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightPress}
            style={styles.iconButton}
          >
            <Bell size={22} color={Colors.ink} strokeWidth={2} />
            {hasUnreadNotification && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}

        {rightType === "search" && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightPress}
            style={styles.iconButton}
          >
            <Search size={22} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.canvas,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  title: {
    ...Typography.header,
    fontSize: 19,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  unreadDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
});

