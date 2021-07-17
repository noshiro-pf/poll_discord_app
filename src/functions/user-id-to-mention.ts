import type { UserId } from '../types/types';

export const userIdToMention = (userId: UserId): string => `<@!${userId}>`;
