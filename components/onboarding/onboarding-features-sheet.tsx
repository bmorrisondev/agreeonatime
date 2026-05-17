import type { ReactElement } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconMark } from '@/components/onboarding/app-icon-mark';
import {
  ONBOARDING_ACCENT,
  ONBOARDING_BG,
  ONBOARDING_MUTED,
} from '@/components/onboarding/onboarding-theme';

const ICON_TILE_BG = 'rgba(255, 107, 92, 0.2)';
const FEATURE_ROW_BG = 'rgba(255, 255, 255, 0.04)';
const FEATURE_ROW_BORDER = 'rgba(255, 255, 255, 0.08)';
const HERO_ICON_SIZE = 112;
const ACCENT_PILL_BG = 'rgba(255, 107, 92, 0.15)';

type FeatureIconName = 'event' | 'link' | 'how-to-vote';

interface FeatureRow {
  readonly icon: FeatureIconName;
  readonly title: string;
  readonly body: string;
  readonly badge?: string;
}

const FEATURES: readonly FeatureRow[] = [
  {
    icon: 'event',
    title: 'Propose times',
    body: 'Tap available slots from your calendar in seconds',
  },
  {
    icon: 'link',
    title: 'Share a link',
    body: 'Invitees vote from any browser — no download needed',
    badge: 'No app needed',
  },
  {
    icon: 'how-to-vote',
    title: 'Pick the winner',
    body: 'See votes at a glance, confirm the best time for everyone',
  },
];

function HeroAppMark(): ReactElement {
  return (
    <View className="mb-5">
      <AppIconMark size={HERO_ICON_SIZE} />
    </View>
  );
}

function FeatureListRow({ feature }: { readonly feature: FeatureRow }): ReactElement {
  return (
    <View
      className="mb-3 flex-row items-start gap-3 rounded-2xl border p-4"
      style={{
        backgroundColor: FEATURE_ROW_BG,
        borderColor: FEATURE_ROW_BORDER,
      }}
    >
      <View
        className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: ICON_TILE_BG }}
      >
        <MaterialIcons color={ONBOARDING_ACCENT} name={feature.icon} size={26} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="mb-0.5 flex-row flex-wrap items-center gap-2">
          <Text className="text-lg font-semibold text-white">{feature.title}</Text>
          {feature.badge != null ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: ACCENT_PILL_BG }}>
              <Text className="text-xs font-semibold" style={{ color: ONBOARDING_ACCENT }}>
                {feature.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm leading-5" style={{ color: ONBOARDING_MUTED }}>
          {feature.body}
        </Text>
      </View>
    </View>
  );
}

export interface OnboardingFeaturesSheetProps {
  readonly visible: boolean;
  readonly onCreateEvent: () => void;
  readonly onLogIn: () => void;
}

export function OnboardingFeaturesSheet(props: OnboardingFeaturesSheetProps): ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={props.visible}
      onRequestClose={props.onLogIn}
    >
      <View className="flex-1" style={{ backgroundColor: ONBOARDING_BG }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} className="items-center pt-4">
            <HeroAppMark />
            <Text
              accessibilityRole="header"
              className="mb-2 text-center text-3xl font-bold leading-tight text-white"
            >
              Stop the scheduling{' '}
              <Text style={{ color: ONBOARDING_ACCENT }}>back-and-forth</Text>
            </Text>
            <Text
              className="mb-10 max-w-sm text-center text-base leading-6"
              style={{ color: ONBOARDING_MUTED }}
            >
              Pick times. Share a link. Done in seconds.
            </Text>
          </Animated.View>

          <View className="flex-1 justify-center">
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeIn.delay(120 + 80 * index).duration(300)}
              >
                <FeatureListRow feature={feature} />
              </Animated.View>
            ))}
          </View>

          <Pressable
            accessibilityLabel="Create my first event"
            accessibilityRole="button"
            className="mt-4 items-center rounded-2xl py-4"
            style={{ backgroundColor: ONBOARDING_ACCENT }}
            onPress={props.onCreateEvent}
          >
            <Text className="text-lg font-semibold text-white">Create my first event →</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Log in"
            accessibilityRole="button"
            className="mt-3 items-center py-3"
            onPress={props.onLogIn}
          >
            <Text className="text-base font-medium" style={{ color: ONBOARDING_MUTED }}>
              Log in
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
