import type { Meta, StoryObj } from '@storybook/react';
import {
  OfflineProvider,
  useNetworkStatus,
  useOfflineQuery,
} from '@bhuvaneshwararaja/react-offline-first';

function NetworkDemo() {
  const { isOnline, isOffline, ping } = useNetworkStatus();
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 360 }}>
      <p>
        Status: <strong>{isOnline ? 'online' : isOffline ? 'offline' : 'unknown'}</strong>
      </p>
      <button type="button" onClick={() => void ping()}>
        Ping
      </button>
    </div>
  );
}

function QueryDemo() {
  const { data, status, refetch } = useOfflineQuery({
    key: 'story-demo',
    fetcher: async () => ({ hello: 'from Storybook', at: new Date().toISOString() }),
    staleTime: 60_000,
  });
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <p>
        Status: <strong>{status}</strong>
      </p>
      <pre style={{ background: '#f4f4f4', padding: 12 }}>{JSON.stringify(data, null, 2)}</pre>
      <button type="button" onClick={() => void refetch()}>
        Refetch
      </button>
    </div>
  );
}

const meta: Meta = {
  title: 'offline-first-react/Hooks',
  decorators: [
    (Story) => (
      <OfflineProvider config={{ storeName: 'storybook' }}>
        <Story />
      </OfflineProvider>
    ),
  ],
};

export default meta;

export const NetworkStatus: StoryObj<typeof meta> = {
  render: () => <NetworkDemo />,
};

export const OfflineQuery: StoryObj<typeof meta> = {
  render: () => <QueryDemo />,
};
