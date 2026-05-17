import type { ReactElement } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconMark } from '@/components/onboarding/app-icon-mark';
import {
  type OnboardingThemeColors,
  useOnboardingTheme,
} from '@/components/onboarding/onboarding-theme';

const HERO_ICON_SIZE = 112;

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

function FeatureListRow({
  feature,
  theme,
}: {
  readonly feature: FeatureRow;
  readonly theme: OnboardingThemeColors;
}): ReactElement {
  return (
    <View
      className="mb-3 flex-row items-center gap-3 rounded-2xl border p-4"
      style={{
        backgroundColor: theme.featureRowBackground,
        borderColor: theme.featureRowBorder,
      }}
    >
      <View
        className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: theme.iconTileBackground }}
      >
        <MaterialIcons
          color={theme.accent}
          name={feature.icon}
          size={26}
          style={{ lineHeight: 26, textAlign: 'center' }}
        />
      </View>
      <View className="min-w-0 flex-1">
        <View className="mb-0.5 flex-row flex-wrap items-center gap-2">
          <Text className="text-lg font-semibold" style={{ color: theme.text }}>
            {feature.title}
          </Text>
          {feature.badge != null ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.accentPillBackground }}>
              <Text className="text-xs font-semibold" style={{ color: theme.accent }}>
                {feature.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm leading-5" style={{ color: theme.muted }}>
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
  const theme = useOnboardingTheme();

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={props.visible}
      onRequestClose={props.onLogIn}
    >
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: Platform.OS === 'web' ? 'center' : undefined,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} className="w-full max-w-md items-center pt-4">
            <View className="mb-5 items-center self-center">
              <AppIconMark size={HERO_ICON_SIZE} theme={theme} />
            </View>
            <Text
              accessibilityRole="header"
              className="mb-2 w-full text-center text-3xl font-bold leading-tight"
              style={{ color: theme.text, textAlign: 'center' }}
            >
              Stop the scheduling{' '}
              <Text style={{ color: theme.accent }}>back-and-forth</Text>
            </Text>
            <Text
              className="mb-10 w-full max-w-sm self-center text-center text-base leading-6"
              style={{ color: theme.muted, textAlign: 'center' }}
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
                <FeatureListRow feature={feature} theme={theme} />
              </Animated.View>
            ))}
          </View>

          <Pressable
            accessibilityLabel="Create my first event"
            accessibilityRole="button"
            className="mt-4 items-center rounded-2xl py-4"
            style={{ backgroundColor: theme.accent }}
            onPress={props.onCreateEvent}
          >
            <Text className="text-lg font-semibold" style={{ color: theme.textOnAccent }}>
              Create my first event →
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Log in"
            accessibilityRole="button"
            className="mt-3 items-center py-3"
            onPress={props.onLogIn}
          >
            <Text className="text-base font-medium" style={{ color: theme.muted }}>
              Log in
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
