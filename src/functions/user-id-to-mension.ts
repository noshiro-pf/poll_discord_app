import { UserId } from '../types/types';

export const userIdToMension = (userId: UserId): string => `<@!${userId}>`;
