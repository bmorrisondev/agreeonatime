import type { ReactElement, ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
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

export default function SupportScreen(): ReactElement {
  const mailto = `mailto:${marketingSupportEmail}?subject=Agree%20on%20a%20Time%20support`;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1 px-5 pt-2">
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-neutral-900 dark:text-neutral-50"
        >
          Support
        </Text>
        <Text className="mb-6 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          We read every message — typical reply within two business days.
        </Text>

        <Pressable
          accessibilityLabel={`Email support at ${marketingSupportEmail}`}
          accessibilityRole="button"
          className="mb-8 self-start rounded-xl border border-[#FF6B5C] px-5 py-3 active:opacity-80"
          onPress={() => {
            void Linking.openURL(mailto);
          }}
        >
          <Text className="text-base font-semibold text-[#FF6B5C]">{marketingSupportEmail}</Text>
        </Pressable>

        <H2>Frequently asked questions</H2>

        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Do invitees need an account?
        </Text>
        <P>No. Invitees can vote from a shared link; owners sign in to create and manage events.</P>

        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Where is my data stored?
        </Text>
        <P>
          Application data lives in Convex-backed infrastructure. See the Privacy policy for processors like email and
          analytics.
        </P>

        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          How do I delete my account?
        </Text>
        <P>
          In-app account deletion is shipping with the settings screen. Until then, email {marketingSupportEmail} from
          the address on your account and we will process the request manually.
        </P>

        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Is there a phone number?
        </Text>
        <P>Not yet — email is the fastest way to reach the team during the beta.</P>

        <View className="pb-8">
          <MarketingFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
