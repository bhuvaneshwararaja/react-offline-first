import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    actions: { argTypesRegex: '^on.*' },
  },
};

export default preview;
