import type { ReactElement, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { marketingSupportEmail } from '@/lib/marketing/constants';

function P({ children }: { readonly children: ReactNode }): ReactElement {
  return <Text className="mb-4 text-base leading-relaxed text-neutral-800 dark:text-neutral-200">{children}</Text>;
}

function H2({ children }: { readonly children: string }): ReactElement {
  return (
    <Text
      accessibilityRole="header"
      className="mb-2 mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-50"
    >
      {children}
    </Text>
  );
}

export default function PrivacyScreen(): ReactElement {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1 px-5 pt-2">
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-neutral-900 dark:text-neutral-50"
        >
          Privacy policy
        </Text>
        <Text className="mb-6 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: May 11, 2026 · Contact: {marketingSupportEmail}
        </Text>

        <P>
          Agree on a Time (&quot;we&quot;, &quot;us&quot;) helps groups pick a shared time. This policy explains what we collect,
          why we collect it, how long we keep it, and the services that help us run the product.
        </P>

        <H2>What we collect</H2>
        <P>
          Account data: name and email when you create an owner account. Event content: titles, descriptions,
          proposed times, deadlines, voting choices, and invitee display names entered on polls. Technical data:
          device identifiers needed for push notifications if you opt in, basic diagnostics, and product analytics
          events (for example app opened and scheduling actions) when enabled in your build.
        </P>

        <H2>How we use data</H2>
        <P>
          We use this information to provide scheduling features, sync votes in real time, send transactional email
          (such as magic links or time confirmations), improve reliability, and understand where the experience
          breaks down. We do not sell your personal information.
        </P>

        <H2>Third-party processors</H2>
        <P>
          Depending on how the app is configured, data may be processed by: Convex (database and backend),
          Better Auth (authentication), Resend (email delivery), Expo / EAS (builds and optional push delivery),
          Apple (Sign in with Apple and App Store distribution), RevenueCat (in-app subscriptions when enabled),
          and PostHog (product analytics when EXPO_PUBLIC_POSTHOG_KEY is set). Each vendor processes data under their
          own terms and security practices.
        </P>

        <H2>Retention</H2>
        <P>
          We keep event and voting data while an event is active and for a reasonable period afterward so owners can
          reference outcomes. Server logs may be retained for security and abuse prevention. Exact retention windows
          evolve with the product and will be tightened as we approach general availability.
        </P>

        <H2>Deletion</H2>
        <P>
          Owners can delete their accounts from in-app settings when that flow ships; deletion removes owned events
          and related votes as described in the product. Invitees who only vote on the web can clear browser cookies
          or request deletion by emailing {marketingSupportEmail} with the event link they used.
        </P>

        <H2>International users</H2>
        <P>
          We may process data in the United States or other regions where our subprocessors operate. If you reside in
          the EEA, UK, or Switzerland, you may have additional rights under local law; contact us at the address
          above and we will respond within the timelines required by applicable regulations.
        </P>

        <H2>Children</H2>
        <P>
          Agree on a Time is not directed at children under 13, and we do not knowingly collect their personal
          information.
        </P>

        <H2>Changes</H2>
        <P>
          We will update this page when practices change. Continued use after updates means you accept the revised
          policy.
        </P>

        <View className="pb-8">
          <MarketingFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
