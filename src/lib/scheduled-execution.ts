import { PLApplicator } from 'placeholders-toolkit';

import { showToast } from '@raycast/api';

import { storageKeys } from './common';
import PinsPlaceholders from './placeholders';
import { getStorage, setStorage } from './storage';

/**
 * A scheduled execution of a placeholder.
 */
export interface DelayedExecution {
  /**
   * The pin target to evaluate.
   */
  target: string;

  /**
   * The date and time at which the evaluation should occur.
   */
  dueDate: Date;
}

/**
 * Schedules content to be evaluated by the placeholder system at a later date.
 * @param target The content to evaluate.
 * @param dueDate The date and time at which the content should be evaluated.
 */
export const scheduleTargetEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions = await getStorage(storageKeys.delayedExecutions);
  delayedExecutions.push({ target: target, dueDate: dueDate });
  await setStorage(storageKeys.delayedExecutions, delayedExecutions);
  await showToast({
    title: "Scheduled Delayed Evaluation",
    primaryAction: {
      title: "Cancel",
      onAction: async () => {
        await removedScheduledEvaluation(target, dueDate);
        await showToast({ title: "Canceled Delayed Evaluation" });
      },
    },
  });
};

/**
 * Cancels a schedules evaluation, removing it from the extension's persistent local storage.
 * @param target The content of the evaluation to cancel.
 * @param dueDate The date and time at which the evaluation was scheduled to occur.
 */
export const removedScheduledEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions: DelayedExecution[] = await getStorage(storageKeys.delayedExecutions);
  await setStorage(
    storageKeys.delayedExecutions,
    delayedExecutions.filter((execution) => execution.target != target && new Date(execution.dueDate) != dueDate),
  );
};

/**
 * Checks if any scheduled executions are due to be evaluated, and evaluates them if they are.
 */
export const checkDelayedExecutions = async () => {
  const delayedExecutions: DelayedExecution[] = await getStorage(storageKeys.delayedExecutions);
  const now = new Date();
  for (const execution of delayedExecutions) {
    if (new Date(execution.dueDate) <= now) {
      await PLApplicator.applyToString(execution.target, { allPlaceholders: PinsPlaceholders });
    }
  }
  await setStorage(
    storageKeys.delayedExecutions,
    delayedExecutions.filter((execution) => new Date(execution.dueDate) > now),
  );
};
