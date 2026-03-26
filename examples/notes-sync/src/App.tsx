import { useEffect, useState } from 'react';
import { useMutation, useOfflineQuery, useQueue } from 'react-offline-first';

let serverNote = 'Write something and save. Mutations go through the offline queue.';

export function App() {
  const [body, setBody] = useState('');

  const { data, status, refetch } = useOfflineQuery({
    key: 'note-body',
    fetcher: async () => {
      await new Promise((r) => setTimeout(r, 100));
      return serverNote;
    },
    staleTime: 10_000,
  });

  const { queue, clear } = useQueue();

  const { mutate, status: mStatus } = useMutation<string, string>({
    mutationKey: 'save-note',
    mutationFn: async (text) => {
      await new Promise((r) => setTimeout(r, 150));
      serverNote = text;
      return text;
    },
    onSuccess: () => {
      void refetch();
    },
  });

  useEffect(() => {
    if (typeof data === 'string') setBody(data);
  }, [data]);

  return (
    <main style={{ fontFamily: 'Georgia, serif', maxWidth: 560, margin: '2rem auto', padding: 16 }}>
      <h1>Notes sync</h1>
      <p style={{ color: '#444' }}>
        Query <strong>{status}</strong> · save <strong>{mStatus}</strong>
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, fontSize: 16 }}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => mutate(body)}>
          Save (queued offline)
        </button>
        <button type="button" onClick={() => void refetch()}>
          Reload from cache
        </button>
        <button type="button" onClick={() => clear()}>
          Clear queue ({queue.length})
        </button>
      </div>
      {queue.length > 0 ? (
        <pre style={{ marginTop: 24, background: '#f6f6f6', padding: 12, overflow: 'auto' }}>
          {JSON.stringify(queue, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
