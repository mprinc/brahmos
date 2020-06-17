import { getUniqueId } from './utils';

export const TRANSITION_STATE_INITIAL = 'initial';
export const TRANSITION_STATE_START = 'start';
export const TRANSITION_STATE_SUSPENDED = 'suspended';
export const TRANSITION_STATE_RESOLVED = 'resolved';
export const TRANSITION_STATE_COMPLETED = 'completed';
export const TRANSITION_STATE_TIMED_OUT = 'timedOut';

export const PREDEFINED_TRANSITION_SYNC = {
  transitionId: '',
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

export const PREDEFINED_TRANSITION_DEFERRED = {
  transitionId: getUniqueId(),
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

function shouldProcessTransition(transition) {
  const { transitionState } = transition;
  return (
    transitionState === TRANSITION_STATE_START ||
    transitionState === TRANSITION_STATE_RESOLVED ||
    transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function canCommitTransition(transition) {
  const { transitionState } = transition;
  return (
    transitionState === TRANSITION_STATE_COMPLETED || transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function setTransitionComplete(transition) {
  const { transitionState } = transition;
  if (
    transitionState !== TRANSITION_STATE_TIMED_OUT &&
    transitionState !== TRANSITION_STATE_SUSPENDED
  ) {
    /**
     * If transition is in pending state and hasn't been reset
     * by suspense, then manually reset it.
     * This will only happen if nothing suspends the component
     * in a transition.
     * else mark the transition as complete
     */
    if (transition.isPending) {
      transition.resetIsPending();
      transition.updatePendingState(false);
    } else {
      transition.transitionState = TRANSITION_STATE_COMPLETED;
    }
  }
}

/**
 * get current transition id from the current rendering
 */
export function getTransitionFromFiber(fiber) {
  const { currentTransition } = fiber.root;
  return currentTransition || PREDEFINED_TRANSITION_SYNC;
}

/**
 * function to get first pending transition
 */
export function getFirstTransitionToProcess(root) {
  const { pendingTransitions } = root;
  return pendingTransitions.find(shouldProcessTransition);
}

/**
 * function to check if a transition is a custom transition
 */
export function isCustomTransition(transition) {
  return !!transition.startTransition;
}
