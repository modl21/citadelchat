import { render } from '@testing-library/react';
import { test } from 'vitest';

import App from './App';

if (!('gpu' in navigator)) {
  Object.defineProperty(navigator, 'gpu', {
    value: {},
    writable: true,
  });
}

test('App', () => {
  render(<App />);
});
