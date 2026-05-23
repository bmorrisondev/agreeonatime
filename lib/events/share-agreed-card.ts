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

function sanitizeFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug.slice(0, 40) : 'agreed';
}

function isDesktopWeb(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(pointer: fine)').matches;
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

async function triggerWebDownload(blob: Blob, filename: string): Promise<boolean> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    Alert.alert(t('agreed_share_download_title'), t('agreed_share_download_body'));
    return true;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function sharePngDataUriOnWeb(dataUri: string, filename: string): Promise<boolean> {
  const response = await fetch(dataUri);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: 'image/png' });

  // Desktop: download directly — avoids macOS share sheet copying text + image twice.
  if (isDesktopWeb()) {
    return triggerWebDownload(blob, filename);
  }

  if (typeof navigator.share === 'function') {
    const canShareFiles =
      typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return true;
        }
        Alert.alert(t('agreed_share_error_title'), t('agreed_share_error_body'));
        return false;
      }
    }
  }

  return triggerWebDownload(blob, filename);
}

export async function shareAgreedCard(
  viewRef: RefObject<View | null>,
  input: ShareAgreedCardInput,
): Promise<void> {
  const message = buildAgreedShareMessage(input.title, input.decidedStartTimeMs);
  const filename = `agreeonatime-${sanitizeFilename(input.title)}.png`;

  try {
    const { captureRef } = await import('react-native-view-shot');
    const pixelRatio = PixelRatio.get();
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      width: AGREED_CARD_WIDTH * pixelRatio,
      height: AGREED_CARD_HEIGHT * pixelRatio,
    });

    if (Platform.OS === 'web') {
      await sharePngDataUriOnWeb(uri, filename);
      return;
    }

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
