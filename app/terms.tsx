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

export default function TermsScreen(): ReactElement {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1 px-5 pt-2">
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-neutral-900 dark:text-neutral-50"
        >
          Terms of service
        </Text>
        <Text className="mb-6 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: May 11, 2026 · Contact: {marketingSupportEmail}
        </Text>

        <P>
          These Terms govern your use of Agree on a Time. By creating an account, submitting events, or voting, you
          agree to them. If you disagree, do not use the service.
        </P>

        <H2>The service</H2>
        <P>
          We provide scheduling polls and related collaboration features on an as-is basis. Availability may change
          during beta or early access periods.
        </P>

        <H2>Acceptable use</H2>
        <P>
          Do not abuse the service: no harassment, spam, illegal content, attempts to disrupt other users, or
          attempts to access data you are not authorized to view. We may suspend accounts that violate these rules.
        </P>

        <H2>Content you submit</H2>
        <P>
          You retain rights to the content you submit, but grant us a license to host, process, and display it solely
          to operate Agree on a Time for you and your invitees.
        </P>

        <H2>Disclaimer</H2>
        <P>
          To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular
          purpose, and non-infringement. We are not liable for indirect, incidental, special, consequential, or
          punitive damages arising from your use of the service.
        </P>

        <H2>Limitation of liability</H2>
        <P>
          Our aggregate liability for any claim arising out of these Terms is limited to the greater of twenty-five
          dollars (USD $25) or the amounts you paid us in the twelve months before the claim (currently zero for free
          tiers).
        </P>

        <H2>Governing law</H2>
        <P>
          These Terms are governed by the laws of the United States and the State of Delaware, excluding conflict-of-law
          rules, unless your local consumer protections require otherwise.
        </P>

        <View className="pb-8">
          <MarketingFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
