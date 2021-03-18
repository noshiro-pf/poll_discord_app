import { IRecord } from '../utils/immutable';
import { DateOptionId } from './types';

type DateOptionBaseType = Readonly<{
  id: DateOptionId;
  label: string;
}>;

export type PartialDateOptionJs = Partial<Readonly<DateOptionBaseType>>;

export type IDateOption = IRecord<DateOptionBaseType> &
  Readonly<DateOptionBaseType>;

const IDateOptionRecordFactory = IRecord<DateOptionBaseType>({
  id: '' as DateOptionId,
  label: '',
});

export const createIDateOption: (
  from?: DateOptionBaseType
) => IDateOption = IDateOptionRecordFactory;

export const fillDateOption: (
  from: PartialDateOptionJs
) => IDateOption = IDateOptionRecordFactory;
