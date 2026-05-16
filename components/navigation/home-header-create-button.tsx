import type { ReactElement } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const BRAND = '#FF6B5C';
const SIZE = 40;
const RADIUS = 12;

export interface HomeHeaderCreateButtonProps {
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}

/**
 * Home header “+” — frosted “liquid glass” (system material) on iOS; solid brand pill elsewhere.
 */
export function HomeHeaderCreateButton({
  onPress,
  accessibilityLabel,
}: HomeHeaderCreateButtonProps): ReactElement {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  if (Platform.OS !== 'ios') {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        className="h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B5C] active:opacity-90"
        hitSlop={6}
        onPress={onPress}
      >
        <Text
          allowFontScaling
          className="text-2xl font-light leading-[22px] text-white"
          maxFontSizeMultiplier={2}
        >
          +
        </Text>
      </Pressable>
    );
  }

  const tint = isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
    >
      <View style={styles.clip}>
        <BlurView
          intensity={isDark ? 72 : 64}
          style={styles.blur}
          tint={tint}
        >
          <Text
            allowFontScaling
            maxFontSizeMultiplier={2}
            style={styles.glyph}
          >
            +
          </Text>
        </BlurView>
        <View
          pointerEvents="none"
          style={[
            styles.glassEdge,
            { borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.65)' },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  blur: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  glyph: {
    color: BRAND,
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
    marginTop: -1,
  },
  glassEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
