import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('renders the canvas SVG', () => {
    render(<App />);
    expect(screen.getByTestId('canvas-svg')).toBeInTheDocument();
  });

  it('renders grid layer', () => {
    render(<App />);
    expect(screen.getByTestId('grid-layer')).toBeInTheDocument();
  });

  it('renders toolbar', () => {
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('renders status bar with segment idle message', () => {
    render(<App />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByText(/Clique pour placer le premier point/)).toBeInTheDocument();
  });

  it('renders action bar with undo/redo disabled initially', () => {
    render(<App />);
    expect(screen.getByTestId('action-undo')).toBeDisabled();
    expect(screen.getByTestId('action-redo')).toBeDisabled();
  });

  it('renders print button disabled when canvas is empty', () => {
    render(<App />);
    expect(screen.getByTestId('action-print')).toBeDisabled();
  });

  it('renders save indicator', () => {
    render(<App />);
    expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
  });

  it('renders mode selector', () => {
    render(<App />);
    expect(screen.getByTestId('mode-selector')).toBeInTheDocument();
  });

  it('renders settings button in action bar', () => {
    render(<App />);
    expect(screen.getByTestId('settings-button')).toBeInTheDocument();
  });

  it('shows new construction confirmation dialog on button click', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('action-new'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });
});
