import type { DateOptionId } from './types';
import { createDateOptionId } from './types';

export type DateOption = Readonly<{
  id: DateOptionId;
  label: string;
}>;

export type PartialDateOption = Partial<DateOption>;

const defaultDateOption: DateOption = {
  id: createDateOptionId(''),
  label: '',
} as const;

const d = defaultDateOption;
export const fillDateOption = (from: PartialDateOption): DateOption => ({
  id: from.id ?? d.id,
  label: from.label ?? d.label,
});
