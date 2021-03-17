import { mapNullable } from '@noshiro/ts-utils';
import { MessageEmbed } from 'discord.js';
import { thumbnailUrl } from './constants';
import { createSummaryValue } from './cretate-summary-value';
import { IPoll } from './types/poll';

export const createSummaryMessage = (poll: IPoll): MessageEmbed =>
  new MessageEmbed()
    .setColor('#3e68b0')
    .setTitle(`Collected Results for ${poll.title}`)
    .setThumbnail(thumbnailUrl)
    .addFields(
      poll.dateOptions
        .map((d) => ({
          name: d.label,
          value: mapNullable(createSummaryValue)(poll.answers.get(d.id)) ?? '',
        }))
        .toArray()
    )
    .setTimestamp();
