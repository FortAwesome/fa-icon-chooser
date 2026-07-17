import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// The real <FaIconChooser> is a Stencil web component (ESM + customElements + network on
// mount) — not a good fit for a jsdom unit test. Its mount and the onFinish round-trip are
// covered by the browser-driven flow; here we stub it and test App's own toggle logic.
jest.mock('@fortawesome/fa-icon-chooser-react', () => ({
  FaIconChooser: () => <div data-testid="fa-icon-chooser" />,
}));

// devRuntime runs a network bootstrap on import that is irrelevant here and absent in jsdom.
jest.mock('./devRuntime', () => ({
  handleQuery: jest.fn(),
  getUrlText: jest.fn(),
  getLocalConfig: () => ({ props: { version: '6.7.2' } }),
}));

test('shows the trigger initially, then reveals the chooser when clicked', async () => {
  const user = userEvent.setup();
  render(<App />);

  const trigger = screen.getByRole('button', { name: /choose an icon/i });
  expect(trigger).toBeInTheDocument();
  expect(screen.queryByTestId('fa-icon-chooser')).not.toBeInTheDocument();

  await user.click(trigger);

  expect(screen.getByTestId('fa-icon-chooser')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /choose an icon/i })).not.toBeInTheDocument();
});
