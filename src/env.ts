import dotenv from 'dotenv';
dotenv.config();

export const TOKEN = process.env.TOKEN ?? '';

export const isDev = process.env.NODE_ENV === 'development';
