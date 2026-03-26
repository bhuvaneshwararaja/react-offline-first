import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { MutationOptions, MutationResult, MutationStatus } from '../types/index.js';
import { useOfflineEngine } from '../context/OfflineContext.js';

function statusForKey(
  engine: NonNullable<ReturnType<typeof useOfflineEngine>>,
  mutationKey: string
): MutationStatus {
  const rows = engine.queue.list().filter((m) => m.key === mutationKey);
  if (rows.some((m) => m.status === 'failed')) return 'error';
  if (rows.some((m) => m.status === 'syncing')) return 'syncing';
  if (rows.some((m) => m.status === 'pending')) return 'pending';
  return 'idle';
}

/**
 * Enqueues a mutation: runs immediately when online, otherwise persists until the queue drains.
 * Register `mutationKey` once per logical mutation type.
 */
export function useMutation<TInput, TOutput>(
  options: MutationOptions<TInput, TOutput>
): MutationResult<TInput> {
  const engine = useOfflineEngine();
  const opts = useRef(options);
  opts.current = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => engine?.subscribe(onStoreChange) ?? (() => {}),
    [engine]
  );
  const getSnapshot = useCallback(
    () => (engine ? statusForKey(engine, options.mutationKey) : 'idle'),
    [engine, options.mutationKey]
  );
  const getServerSnapshot = useCallback(() => 'idle' as MutationStatus, []);
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pendingCount = useSyncExternalStore(
    subscribe,
    () => engine?.pendingCountForKey(options.mutationKey) ?? 0,
    () => 0
  );

  useLayoutEffect(() => {
    if (!engine) return;
    return engine.registerMutation(options.mutationKey, async (input) => {
      const o = opts.current;
      try {
        const out = await o.mutationFn(input as TInput);
        o.onSuccess?.(out, input as TInput);
        return out;
      } catch (e) {
        o.onError?.(e, input as TInput);
        throw e;
      } finally {
        o.onSettled?.();
      }
    });
  }, [engine, options.mutationKey]);

  const mutate = useCallback(
    (input: TInput) => {
      opts.current.onMutate?.(input);
      if (!engine) {
        void opts.current.mutationFn(input).catch(() => {});
        return;
      }
      const idem = opts.current.idempotencyKey?.(input);
      void engine.enqueueMutation({
        mutationKey: opts.current.mutationKey,
        input,
        maxRetries: engine.getMaxRetries(),
        strategy:
          opts.current.conflictStrategy ?? engine.strategyForMutationKey(opts.current.mutationKey),
        idempotencyKey: idem,
      });
    },
    [engine]
  );

  const cancelAll = useCallback(() => {
    engine?.cancelAllForKey(options.mutationKey);
  }, [engine, options.mutationKey]);

  return { mutate, status, pendingCount, cancelAll };
}
