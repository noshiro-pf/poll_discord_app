import type { IMap } from '@noshiro/ts-utils';
import { castWritable } from '@noshiro/ts-utils';
import type { EmbedFieldData } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { embedMessageColor, footerText } from '../constants';
import type { Group } from '../types/group';
import type { Poll } from '../types/poll';
import type { UserId } from '../types/types';
import {
  gpCreateSummaryField,
  rpCreateSummaryField,
} from './create-summary-value';

export const rpCreateSummaryMessage = (
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): MessageEmbed =>
  new MessageEmbed()
    .setColor(embedMessageColor)
    .setTitle(`Collected Results for "${poll.title}"`)
    .addFields(castWritable(rpCreateSummaryFields(poll, userIdToDisplayName)))
    .setFooter(footerText)
    .setTimestamp();

const rpCreateSummaryFields = (
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): readonly EmbedFieldData[] =>
  poll.dateOptions.map((d) =>
    rpCreateSummaryField(d, poll, userIdToDisplayName)
  );

export const gpCreateSummaryMessage = (
  groups: readonly Group[]
): MessageEmbed =>
  new MessageEmbed()
    .setColor(embedMessageColor)
    .addFields(castWritable(gpCreateFields(groups)));

const gpCreateFields = (groups: readonly Group[]): readonly EmbedFieldData[] =>
  groups.map(gpCreateSummaryField);
