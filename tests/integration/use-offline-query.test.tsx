import { describe, it, expect } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { OfflineProvider } from '../../src/context/OfflineProvider.js';
import { useOfflineQuery } from '../../src/hooks/useOfflineQuery.js';

function Q() {
  const { data, status } = useOfflineQuery({
    key: 't',
    fetcher: async () => ({ items: [1] }),
    staleTime: 60_000,
  });
  return (
    <div>
      <span data-testid="s">{status}</span>
      <span data-testid="d">{data ? JSON.stringify(data) : 'none'}</span>
    </div>
  );
}

describe('useOfflineQuery', () => {
  it('loads data when online', async () => {
    render(
      <OfflineProvider>
        <Q />
      </OfflineProvider>
    );
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('success'));
    expect(screen.getByTestId('d').textContent).toContain('1');
  });
});
