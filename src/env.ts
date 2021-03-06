/* eslint-disable @typescript-eslint/dot-notation */
import dotenv from 'dotenv';
dotenv.config();

export const DISCORD_TOKEN = process.env['DISCORD_TOKEN'] ?? '';

export const isDev = process.env['NODE_ENV'] === 'development';

export const DATABASE_URL = isDev
  ? process.env['LOCAL_DATABASE_URL']
  : process.env['DATABASE_URL'];
