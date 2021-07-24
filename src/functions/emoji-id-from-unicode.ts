import { emojis } from '../constants';
import type { AnswerType } from '../types/types';

export const emojiIdFromUnicode = (unicode: string): AnswerType | undefined => {
  switch (unicode) {
    case emojis.ok.unicode:
      return 'ok';
    case emojis.ng.unicode:
      return 'ng';
    case emojis.neither.unicode:
      return 'neither';
    default:
      return undefined;
  }
};
