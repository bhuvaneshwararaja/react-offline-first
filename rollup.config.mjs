import typescript from '@rollup/plugin-typescript';

const external = ['react', 'react/jsx-runtime', 'react-dom'];

const ts = () =>
  typescript({
    tsconfig: './tsconfig.rollup.json',
    exclude: ['**/*.test.ts', '**/*.test.tsx'],
  });

export default [
  {
    input: 'src/index.ts',
    external,
    plugins: [ts()],
    output: [
      { file: 'dist/index.mjs', format: 'es', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    ],
  },
  {
    input: 'src/hooks/index.ts',
    external,
    plugins: [ts()],
    output: { file: 'dist/hooks/index.mjs', format: 'es', sourcemap: true },
  },
  {
    input: 'src/adapters/index.ts',
    external,
    plugins: [ts()],
    output: { file: 'dist/adapters/index.mjs', format: 'es', sourcemap: true },
  },
  {
    input: 'src/sw.ts',
    external,
    plugins: [ts()],
    output: { file: 'dist/sw.js', format: 'es', sourcemap: true },
  },
];
