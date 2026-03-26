import { describe, it, expect } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { OfflineProvider } from '../../src/context/OfflineProvider.js';
import { useMutation } from '../../src/hooks/useMutation.js';

function M() {
  const { mutate, status, pendingCount } = useMutation({
    mutationKey: 'todo',
    mutationFn: async (input: { n: number }) => input,
  });
  return (
    <div>
      <button type="button" onClick={() => mutate({ n: 1 })}>
        go
      </button>
      <span data-testid="s">{status}</span>
      <span data-testid="p">{pendingCount}</span>
    </div>
  );
}

describe('useMutation', () => {
  it('registers handler and completes mutation when online', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup();
    render(
      <OfflineProvider>
        <M />
      </OfflineProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('0'));
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('idle'));
  });
});
