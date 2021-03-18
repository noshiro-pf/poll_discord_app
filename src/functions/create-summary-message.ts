import { mapNullable } from '@noshiro/ts-utils';
import { EmbedFieldData, MessageEmbed } from 'discord.js';
import { footerText } from '../constants';
import { IPoll } from '../types/poll';
import { createSummaryValue } from './cretate-summary-value';

export const createSummaryMessage = (poll: IPoll): MessageEmbed =>
  new MessageEmbed()
    .setColor('#3e68b0')
    .setTitle(`Collected Results for "${poll.title}"`)
    .addFields(createSummaryFields(poll))
    .setFooter(footerText)
    .setTimestamp();

export const createSummaryFields = (poll: IPoll): EmbedFieldData[] =>
  poll.dateOptions
    .map((d) => ({
      name: d.label,
      value: mapNullable(createSummaryValue)(poll.answers.get(d.id)) ?? '',
    }))
    .toArray();
