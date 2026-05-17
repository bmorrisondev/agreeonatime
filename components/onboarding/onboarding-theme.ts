import { useColorScheme } from '@/hooks/use-color-scheme';

/** Brand accent — same in light and dark. */
export const ONBOARDING_ACCENT = '#FF6B5C';

export interface OnboardingThemeColors {
  readonly background: string;
  readonly accent: string;
  readonly muted: string;
  readonly borderInactive: string;
  readonly text: string;
  readonly textOnAccent: string;
  readonly inputBackground: string;
  readonly featureRowBackground: string;
  readonly featureRowBorder: string;
  readonly iconTileBackground: string;
  readonly accentPillBackground: string;
  readonly markCheckStroke: string;
  readonly markClockHand: string;
  readonly markCenterDot: string;
  readonly spinner: string;
}

const dark: OnboardingThemeColors = {
  background: '#1C1A2E',
  accent: ONBOARDING_ACCENT,
  muted: '#8884AA',
  borderInactive: '#2E2C50',
  text: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  inputBackground: '#252344',
  featureRowBackground: 'rgba(255, 255, 255, 0.04)',
  featureRowBorder: 'rgba(255, 255, 255, 0.08)',
  iconTileBackground: 'rgba(255, 107, 92, 0.2)',
  accentPillBackground: 'rgba(255, 107, 92, 0.15)',
  markCheckStroke: '#1C1A2E',
  markClockHand: '#FFFFFF',
  markCenterDot: '#FFFFFF',
  spinner: '#FFFFFF',
};

const light: OnboardingThemeColors = {
  background: '#FFFFFF',
  accent: ONBOARDING_ACCENT,
  muted: '#737373',
  borderInactive: '#E5E5E5',
  text: '#171717',
  textOnAccent: '#FFFFFF',
  inputBackground: '#FAFAFA',
  featureRowBackground: 'rgba(0, 0, 0, 0.03)',
  featureRowBorder: 'rgba(0, 0, 0, 0.08)',
  iconTileBackground: 'rgba(255, 107, 92, 0.12)',
  accentPillBackground: 'rgba(255, 107, 92, 0.12)',
  markCheckStroke: '#FFFFFF',
  markClockHand: '#171717',
  markCenterDot: '#171717',
  spinner: ONBOARDING_ACCENT,
};

export function getOnboardingTheme(scheme: 'light' | 'dark' | null | undefined): OnboardingThemeColors {
  return scheme === 'dark' ? dark : light;
}

export function useOnboardingTheme(): OnboardingThemeColors {
  const scheme = useColorScheme();
  return getOnboardingTheme(scheme === 'dark' ? 'dark' : 'light');
}
