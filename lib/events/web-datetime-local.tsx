import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import { createElement } from 'react';

export function formatMsForDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function webDatetimeLocalStyle(scheme: 'light' | 'dark' | null): CSSProperties {
  const dark = scheme === 'dark';
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: dark ? '#525252' : '#d4d4d4',
    backgroundColor: dark ? '#0a0a0a' : '#fafafa',
    color: dark ? '#fafafa' : '#171717',
    fontSize: 16,
  };
}

export function WebDatetimeLocalInput(props: {
  readonly valueMs: number;
  readonly onChangeMs: (ms: number) => void;
  readonly minMs?: number;
  readonly disabled?: boolean;
  readonly accessibilityLabel: string;
  readonly colorScheme: 'light' | 'dark' | null;
}): ReactElement {
  return createElement('input', {
    type: 'datetime-local',
    step: 60,
    'aria-label': props.accessibilityLabel,
    disabled: props.disabled,
    min: props.minMs != null ? formatMsForDatetimeLocal(props.minMs) : undefined,
    value: formatMsForDatetimeLocal(props.valueMs),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const ms = new Date(e.target.value).getTime();
      if (!Number.isNaN(ms)) {
        props.onChangeMs(ms);
      }
    },
    style: webDatetimeLocalStyle(props.colorScheme),
  });
}
