import { Client, Message } from 'discord.js';
import { TOKEN } from './env';

const client = new Client();

const reply = (message: Message): void => {
  if (message.content === '!ping') {
    // send back "Pong." to the channel the message was sent in
    message.channel.send('Pong.').catch(console.error);
  }
};

client.on('message', (message) => {
  reply(message);
});

client.once('ready', () => {
  console.log('Ready!');
});

client.login(TOKEN).catch(console.error);
