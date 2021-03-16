import { MessageEmbed } from 'discord.js';

export const createSummaryMessage = (): MessageEmbed =>
  new MessageEmbed()
    .setColor('#3e68b0')
    .setTitle('Collected Results for 2020-03-15')
    .addFields(
      {
        name: '22:00-22:30',
        value:
          ':o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb',
      },
      {
        name: '22:00-22:30',
        value:
          ':o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb',
      },
      {
        name: '22:00-22:30',
        value:
          ':o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb',
      }
    )
    .setTimestamp();
