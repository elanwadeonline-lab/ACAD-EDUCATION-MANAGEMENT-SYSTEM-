import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface UnderlineTabsProps {
  tabs: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  children?: React.ReactNode[];
}

export function UnderlineTabs({
  tabs,
  selectedIndex,
  onChange,
  children,
}: UnderlineTabsProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Content padding in Page is 20px on each side
  const [containerWidth, setContainerWidth] = useState(windowWidth - 40);
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  const indicatorOffset = useSharedValue(selectedIndex);

  useEffect(() => {
    indicatorOffset.value = withTiming(selectedIndex, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    if (!isUserScrolling.current && scrollRef.current && containerWidth > 0) {
      scrollRef.current.scrollTo({
        x: selectedIndex * containerWidth,
        animated: true,
      });
    }
  }, [selectedIndex, containerWidth]);

  const handleTabPress = (index: number) => {
    isUserScrolling.current = false;
    onChange(index);
    if (scrollRef.current && containerWidth > 0) {
      scrollRef.current.scrollTo({
        x: index * containerWidth,
        animated: true,
      });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const progress = offsetX / containerWidth;
    if (isUserScrolling.current) {
      indicatorOffset.value = progress;
    }
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);
    isUserScrolling.current = false;
    if (index >= 0 && index < tabs.length && index !== selectedIndex) {
      onChange(index);
    }
  };

  const tabWidthPercent = 100 / tabs.length;

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const leftPercent = indicatorOffset.value * tabWidthPercent;
    return {
      left: `${leftPercent}%`,
      width: `${tabWidthPercent}%`,
    };
  });

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      {/* Clean Underline Tab Header */}
      <View style={styles.tabBar}>
        {tabs.map((label, index) => {
          const isActive = selectedIndex === index;
          return (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              onPress={() => handleTabPress(index)}
              style={styles.tabButton}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        {/* Thin Animated Orange Underline */}
        <Animated.View style={[styles.indicatorTrack, animatedIndicatorStyle]}>
          <View style={styles.indicatorBar} />
        </Animated.View>
      </View>

      {/* Swipeable Content Views */}
      {children && children.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isUserScrolling.current = true;
          }}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={styles.pager}
          contentContainerStyle={{ width: containerWidth * tabs.length }}
        >
          {children.map((child, index) => (
            <View
              key={index}
              style={[styles.pagePane, { width: containerWidth }]}
            >
              {child}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const MANROPE_SEMIBOLD =
  Platform.OS === 'web'
    ? 'Manrope_600SemiBold, Manrope, sans-serif'
    : 'Manrope_600SemiBold';
const MANROPE_MEDIUM =
  Platform.OS === 'web'
    ? 'Manrope_500Medium, Manrope, sans-serif'
    : 'Manrope_500Medium';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 4,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#F59E0B',
    fontWeight: '600',
    fontFamily: MANROPE_SEMIBOLD,
  },
  tabLabelInactive: {
    color: '#111014',
    fontWeight: '500',
    fontFamily: MANROPE_MEDIUM,
  },
  indicatorTrack: {
    position: 'absolute',
    bottom: -1,
    height: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorBar: {
    width: '60%',
    height: 2.5,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  pager: {
    width: '100%',
  },
  pagePane: {
    paddingHorizontal: 0,
    gap: 16,
  },
});

