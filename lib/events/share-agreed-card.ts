import { Alert, PixelRatio, Platform, Share, type View } from 'react-native';
import type { RefObject } from 'react';
import * as Sharing from 'expo-sharing';

import { AGREED_CARD_HEIGHT, AGREED_CARD_WIDTH } from '@/components/events/agreed-card';
import { buildAgreedShareMessage } from '@/lib/events/build-agreed-share-message';
import { t } from '@/lib/i18n/t';

export interface ShareAgreedCardInput {
  readonly title: string;
  readonly decidedStartTimeMs: number;
}

async function sharePlainText(message: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(message);
      Alert.alert(t('agreed_share_copied_title'), t('agreed_share_copied_body'));
    } catch {
      Alert.alert(t('agreed_share_error_title'), t('agreed_share_error_body'));
    }
    return;
  }
  try {
    await Share.share({ message });
  } catch {
    Alert.alert(t('agreed_share_error_title'), t('agreed_share_error_body'));
  }
}

export async function shareAgreedCard(
  viewRef: RefObject<View | null>,
  input: ShareAgreedCardInput,
): Promise<void> {
  const message = buildAgreedShareMessage(input.title, input.decidedStartTimeMs);

  if (Platform.OS === 'web') {
    await sharePlainText(message);
    return;
  }

  try {
    const { captureRef } = await import('react-native-view-shot');
    const pixelRatio = PixelRatio.get();
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: AGREED_CARD_WIDTH * pixelRatio,
      height: AGREED_CARD_HEIGHT * pixelRatio,
    });

    const canShareFile = await Sharing.isAvailableAsync();
    if (canShareFile) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t('decided_share_news'),
      });
      return;
    }

    await Share.share({ message, url: uri });
  } catch {
    await sharePlainText(message);
  }
}
