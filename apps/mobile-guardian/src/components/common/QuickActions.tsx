import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import {
  SolidGraduationCap,
  SolidWallet,
  SolidMessage,
  SolidCalendar,
  SolidAttendance,
} from './SolidIcons';

const IMAGES = {
  results: require('../../../assets/images/qa_results.jpg'),
  fees: require('../../../assets/images/qa_fees.jpg'),
  messages: require('../../../assets/images/qa_messages.jpg'),
  calendar: require('../../../assets/images/qa_calendar.jpg'),
  attendance: require('../../../assets/images/qa_attendance.jpg'),
};

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  image: any;
  icon: React.ReactNode;
  span?: 'half' | 'full';
}

function QuickActionCard({
  item,
  onPress,
}: {
  item: QuickActionItem;
  onPress: (route: string) => void;
}) {
  const active = useSharedValue(0);

  const handlePressIn = () => {
    active.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    active.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  };

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(active.value, [0, 1], [1.10, 1.01]) }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    maxHeight: interpolate(active.value, [0, 1], [0, 24]),
    transform: [{ translateY: interpolate(active.value, [0, 1], [6, 0]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.subtitle}`}
      onPress={() => onPress(item.route)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={Platform.OS === 'web' ? handlePressIn : undefined}
      onHoverOut={Platform.OS === 'web' ? handlePressOut : undefined}
      style={[
        styles.card,
        item.span === 'full' ? styles.cardFull : styles.cardHalf,
      ]}
    >
      {/* Realistic Photographic Image that continuously covers container while subtly shrinking */}
      <Animated.Image
        source={item.image}
        style={[styles.cardImage, animatedImageStyle]}
        resizeMode="cover"
      />

      {/* Atmospheric photographic contrast overlay */}
      <View style={styles.overlay} />

      {/* Foreground Content Composition */}
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <View style={styles.chevronCircle}>
            <ChevronRight size={14} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.bottomBlock}>
          {/* SVG icon beside title on the same horizontal line */}
          <View style={styles.titleRow}>
            <View style={styles.iconInline}>{item.icon}</View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          {/* Animated supporting subtitle revealed on interaction */}
          <Animated.View style={[styles.subtitleContainer, animatedSubtitleStyle]}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
}

export function QuickActions({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const router = useRouter();

  const handlePress = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route as Href);
    }
  };

  const actions: QuickActionItem[] = [
    {
      id: 'academics',
      title: 'Results',
      subtitle: 'Report cards & assessments',
      route: '/academics',
      image: IMAGES.results,
      icon: <SolidGraduationCap size={20} color="#F59E0B" secondaryColor="#FBBF24" />,
      span: 'half',
    },
    {
      id: 'payments',
      title: 'Fees',
      subtitle: 'Due balance & receipts',
      route: '/payments',
      image: IMAGES.fees,
      icon: <SolidWallet size={20} color="#F59E0B" secondaryColor="#FBBF24" />,
      span: 'half',
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'Teachers & admin faculty',
      route: '/messages',
      image: IMAGES.messages,
      icon: <SolidMessage size={20} color="#F59E0B" secondaryColor="#FBBF24" />,
      span: 'half',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Term dates & exams',
      route: '/calendar',
      image: IMAGES.calendar,
      icon: <SolidCalendar size={20} color="#F59E0B" secondaryColor="#FBBF24" />,
      span: 'half',
    },
    {
      id: 'attendance',
      title: 'Daily Attendance',
      subtitle: 'Morning roll-call & check-in patterns',
      route: '/attendance',
      image: IMAGES.attendance,
      icon: <SolidAttendance size={20} color="#F59E0B" secondaryColor="#FBBF24" />,
      span: 'full',
    },
  ];

  return (
    <View style={styles.grid}>
      {actions.map((item) => (
        <QuickActionCard key={item.id} item={item} onPress={handlePress} />
      ))}
    </View>
  );
}

const MANROPE_SEMIBOLD = Platform.OS === 'web' ? 'Manrope_600SemiBold, Manrope, sans-serif' : 'Manrope_600SemiBold';
const MANROPE_MEDIUM = Platform.OS === 'web' ? 'Manrope_500Medium, Manrope, sans-serif' : 'Manrope_500Medium';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 4,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#090D16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 20px -3px rgba(15, 23, 42, 0.16), 0 3px 8px -2px rgba(15, 23, 42, 0.08)',
          cursor: 'pointer',
        }
      : {}),
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? ({ objectFit: 'cover' } as any) : {}),
  },
  cardHalf: {
    width: '48%',
    flexGrow: 1,
    height: 124,
  },
  cardFull: {
    width: '100%',
    height: 110,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.25) 45%, rgba(15, 23, 42, 0.85) 100%)',
        }
      : {}),
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBlock: {
    gap: 4,
    justifyContent: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconInline: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: MANROPE_SEMIBOLD,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flexShrink: 1,
  },
  subtitleContainer: {
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 11,
    color: '#F1F5F9',
    opacity: 0.95,
    fontWeight: '500',
    fontFamily: MANROPE_MEDIUM,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
