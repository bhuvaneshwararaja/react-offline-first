import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { OfflineProvider } from '../../src/context/OfflineProvider.js';
import { useOfflineEngine } from '../../src/context/OfflineContext.js';

function Probe() {
  const engine = useOfflineEngine();
  return <div data-testid="e">{engine ? 'ok' : 'no'}</div>;
}

describe('OfflineProvider', () => {
  it('provides engine after mount', async () => {
    const { getByTestId } = render(
      <OfflineProvider>
        <Probe />
      </OfflineProvider>
    );
    await waitFor(() => expect(getByTestId('e').textContent).toBe('ok'));
  });
});
