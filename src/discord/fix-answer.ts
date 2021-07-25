import type { DeepReadonly } from '@noshiro/ts-utils';
import {
  IRecord,
  ISet,
  isNotUndefined,
  ituple,
  promiseToResult,
  Result,
} from '@noshiro/ts-utils';
import type { Collection, Message } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { emojis } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updatePoll } from '../in-memory-database';
import type { Poll } from '../types/poll';
import type { DatabaseRef, DateOptionId, UserId } from '../types/types';

/** @description reactions を取得して poll.answers を修復（データベースが壊れたときの保険）
 */
export const fixAnswerAndUpdateMessage = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  messages: Collection<string, Message>,
  poll: Poll
): Promise<Result<undefined, string>> => {
  const dateOptionMessages: DeepReadonly<[string, Message][]> = poll.dateOptions
    .map((dateOption) =>
      ituple(
        dateOption.id,
        messages.find((m) => m.id === dateOption.id)
      )
    )
    .filter((a): a is [DateOptionId, Message] => isNotUndefined(a[1]));

  const dateOptionMessagesFilled = await Promise.all(
    dateOptionMessages.map(([dateId, msg]) =>
      (msg.partial ? msg.fetch() : Promise.resolve(msg)).then((m) =>
        ituple(dateId, m)
      )
    )
  );

  // TODO: flatMapにする
  const reactionsForThisPoll: DeepReadonly<
    [
      DateOptionId,
      {
        ok: UserId[] | undefined;
        neither: UserId[] | undefined;
        ng: UserId[] | undefined;
      }
    ][]
  > = await Promise.all(
    dateOptionMessagesFilled.map(([dateId, msg]) =>
      Promise.all([
        msg.reactions
          .resolve(emojis.ok.unicode)
          ?.users.fetch()
          .then((ok) => ok?.filter((u) => !u.bot).map((u) => u.id)),
        msg.reactions
          .resolve(emojis.neither.unicode)
          ?.users.fetch()
          .then((neither) => neither?.filter((u) => !u.bot).map((u) => u.id)),
        msg.reactions
          .resolve(emojis.ng.unicode)
          ?.users.fetch()
          .then((ng) => ng?.filter((u) => !u.bot).map((u) => u.id)),
      ]).then(([ok, neither, ng]) =>
        ituple(dateId, {
          ok,
          neither,
          ng,
        })
      )
    )
  );

  /*
    [
      [
        "868749175842553877",
        {
          "ok": ["623145801702440983"],
          "neither": ["623145801702440983"],
          "ng": ["623145801702440983"]
        }
      ],
      [
        "868749176924696606",
        {
          "ok": [],
          "neither": ["623145801702440983"],
          "ng": ["623145801702440983"]
        }
      ],
      [
        "868749177868398622",
        {
          "ok": ["623145801702440983"],
          "neither": ["623145801702440983"],
          "ng": ["623145801702440983"]
        }
      ]
    ]
  */
  const newPollFilled: Poll = IRecord.update(poll, 'answers', (answers) =>
    answers.withMutations(
      reactionsForThisPoll.map(([dateId, reactions]) => ({
        type: 'set',
        key: dateId,
        value: {
          ok: ISet.new(reactions.ok ?? []),
          ng: ISet.new(reactions.ng ?? []),
          neither: ISet.new(reactions.neither ?? []),
        },
      }))
    )
  );

  const pollMessage = messages.find((m) => m.id === poll.id);

  if (pollMessage === undefined) {
    return Result.err(`message with id ${poll.id} not found`);
  }

  const userIdToDisplayNameResult = await createUserIdToDisplayNameMap(
    pollMessage.guild,
    getUserIdsFromAnswers(newPollFilled.answers).toArray()
  );

  if (Result.isErr(userIdToDisplayNameResult)) {
    return userIdToDisplayNameResult;
  }

  const userIdToDisplayName = userIdToDisplayNameResult.value;

  const [updatePollResult, editSummaryMessageResult] = await Promise.all([
    updatePoll(databaseRef, psqlClient, newPollFilled),
    promiseToResult(
      pollMessage
        .edit(createSummaryMessage(newPollFilled, userIdToDisplayName))
        .then(() => undefined)
    ),
  ]);

  if (Result.isErr(updatePollResult)) {
    return Result.err('updatePoll in fixAnswerAndUpdateMessage failed');
  }

  if (Result.isErr(editSummaryMessageResult)) {
    return Result.err(
      `editSummaryMessage in fixAnswerAndUpdateMessage failed: ${String(
        editSummaryMessageResult.value
      )}`
    );
  }

  const addEmojiResult = await promiseToResult(
    pollMessage.react(emojis.refresh.unicode)
  );

  if (Result.isErr(addEmojiResult)) {
    return Result.err(
      `addEmoji in fixAnswerAndUpdateMessage failed: ${String(
        addEmojiResult.value
      )}`
    );
  }

  return Result.ok(undefined);
};
