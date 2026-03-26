import { useMemo, useState } from 'react';
import { useMutation, useOfflineQuery } from 'react-offline-first';

type Todo = { id: string; title: string; done: boolean };

let memoryTodos: Todo[] = [{ id: '1', title: 'Try offline queue', done: false }];

export function App() {
  const [draft, setDraft] = useState('');

  const {
    data: todos,
    status,
    refetch,
  } = useOfflineQuery({
    key: 'todos',
    fetcher: async () => {
      await new Promise((r) => setTimeout(r, 120));
      return [...memoryTodos];
    },
    staleTime: 30_000,
  });

  const {
    mutate,
    status: mStatus,
    pendingCount,
  } = useMutation({
    mutationKey: 'add-todo',
    mutationFn: async (input: { title: string }) => {
      await new Promise((r) => setTimeout(r, 80));
      const t: Todo = { id: crypto.randomUUID(), title: input.title, done: false };
      memoryTodos = [...memoryTodos, t];
      return t;
    },
    onSuccess: () => {
      void refetch();
    },
  });

  const list = useMemo(() => todos ?? [], [todos]);

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '2rem auto', padding: 16 }}>
      <h1>Todo (example)</h1>
      <p style={{ color: '#555' }}>
        Query: <strong>{status}</strong> · Mutation: <strong>{mStatus}</strong>
        {pendingCount > 0 ? ` · pending: ${pendingCount}` : null}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          mutate({ title: t });
          setDraft('');
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New todo"
          style={{ width: '70%', padding: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8, padding: '8px 12px' }}>
          Add
        </button>
      </form>
      <ul>
        {list.map((t) => (
          <li key={t.id}>
            {t.done ? '☑' : '☐'} {t.title}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => void refetch()}>
        Refetch
      </button>
    </main>
  );
}
