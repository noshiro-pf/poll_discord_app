import { EmbedFieldData, MessageEmbed } from 'discord.js';
import { footerText } from '../constants';
import { IPoll } from '../types/poll';
import { UserId } from '../types/types';
import { IMap } from '../utils/immutable';
import { createSummaryField } from './cretate-summary-value';

export const createSummaryMessage = (
  poll: IPoll,
  userIdToDisplayName: IMap<UserId, string>
): MessageEmbed =>
  new MessageEmbed()
    .setColor('#3e68b0')
    .setTitle(`Collected Results for "${poll.title}"`)
    .addFields(createSummaryFields(poll, userIdToDisplayName))
    .setFooter(footerText)
    .setTimestamp();

const createSummaryFields = (
  poll: IPoll,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData[] =>
  poll.dateOptions
    .map((d) => createSummaryField(d, poll, userIdToDisplayName))
    .toArray();
