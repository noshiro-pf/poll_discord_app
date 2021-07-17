import type { IMap } from '@noshiro/ts-utils';
import type { EmbedFieldData } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { footerText } from '../constants';
import type { Poll } from '../types/poll';
import type { UserId } from '../types/types';
import { createSummaryField } from './create-summary-value';

export const createSummaryMessage = (
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): MessageEmbed =>
  new MessageEmbed()
    .setColor('#3e68b0')
    .setTitle(`Collected Results for "${poll.title}"`)
    .addFields(createSummaryFields(poll, userIdToDisplayName))
    .setFooter(footerText)
    .setTimestamp();

const createSummaryFields = (
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData[] =>
  poll.dateOptions.map((d) => createSummaryField(d, poll, userIdToDisplayName));
