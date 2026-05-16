import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ONBOARDING_ACCENT,
  ONBOARDING_BG,
  ONBOARDING_DOT_INACTIVE,
  ONBOARDING_MUTED,
} from '@/components/onboarding/onboarding-theme';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const SLIDES: readonly { readonly headline: string; readonly body: string }[] = [
  { headline: 'Propose times', body: 'Pick your available slots in seconds' },
  { headline: 'Share a link', body: 'No app needed for invitees' },
  { headline: 'Pick the winner', body: 'See votes, choose the best time' },
];

export interface OnboardingValuePagerProps {
  readonly onSkip: () => void;
  readonly onTryItOut: () => void;
}

export function OnboardingValuePager(props: OnboardingValuePagerProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const scrollToPage = useCallback(
    (index: number) => {
      listRef.current?.scrollTo({ x: index * width, animated: true });
    },
    [width],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: ONBOARDING_BG, paddingTop: insets.top }}>
      <AnimatedScrollView
        ref={listRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(Math.max(0, Math.min(SLIDES.length - 1, next)));
        }}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={slide.headline}
            className="flex-1"
            style={{ width, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          >
            <View className="flex-row items-center justify-end pt-2">
              <Pressable
                accessibilityLabel="Skip onboarding"
                accessibilityRole="button"
                hitSlop={12}
                onPress={props.onSkip}
              >
                <Text className="text-base font-semibold" style={{ color: ONBOARDING_MUTED }}>
                  Skip
                </Text>
              </Pressable>
            </View>
            <View className="flex-1 justify-center">
              <Text
                accessibilityRole="header"
                className="mb-3 text-3xl font-bold text-white"
                style={{ color: '#FFFFFF' }}
              >
                {slide.headline}
              </Text>
              <Text className="text-lg leading-6" style={{ color: ONBOARDING_MUTED }}>
                {slide.body}
              </Text>
            </View>
            {index === SLIDES.length - 1 ? (
              <Pressable
                accessibilityLabel="Try it out"
                accessibilityRole="button"
                className="items-center rounded-2xl py-4"
                style={{ backgroundColor: ONBOARDING_ACCENT }}
                onPress={props.onTryItOut}
              >
                <Text className="text-lg font-semibold text-white">Try it out</Text>
              </Pressable>
            ) : (
              <View className="h-14" />
            )}
          </View>
        ))}
      </AnimatedScrollView>

      <View
        className="flex-row justify-center gap-2 pb-2"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {SLIDES.map((_, i) => (
          <Pressable
            key={`dot-${String(i)}`}
            accessibilityLabel={`Go to slide ${String(i + 1)}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              scrollToPage(i);
            }}
          >
            <View
              className="h-2 rounded-full"
              style={{
                width: page === i ? 22 : 8,
                backgroundColor: page === i ? ONBOARDING_ACCENT : ONBOARDING_DOT_INACTIVE,
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
