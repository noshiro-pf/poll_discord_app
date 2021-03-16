import { Client, Message } from 'discord.js';
import { replyTriggerCommand } from './constants';
import { createSummaryMessage } from './create-summary-message';
import { TOKEN } from './env';

const client = new Client();

const reply = async (message: Message): Promise<void> => {
  if (!message.content.startsWith(replyTriggerCommand) || message.author.bot)
    return;

  if (message.content === replyTriggerCommand) {
    const exampleEmbed = createSummaryMessage();
    const repliedMessage = await message.channel
      .send(exampleEmbed)
      .catch((err) => {
        console.error(err);
        return undefined;
      });

    if (repliedMessage === undefined) return;

    setTimeout(() => {
      repliedMessage.delete().catch(console.error);
    }, 5000);
  }
};

client.on('message', (message) => {
  reply(message).catch(console.error);
});

client.once('ready', () => {
  console.log('Ready!');
});

client.login(TOKEN).catch(console.error);
