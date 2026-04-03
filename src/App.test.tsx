import { render, screen } from '@testing-library/react';
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

  it('renders mode selector', () => {
    render(<App />);
    expect(screen.getByTestId('mode-selector')).toBeInTheDocument();
  });

  it('renders settings button in action bar', () => {
    render(<App />);
    expect(screen.getByTestId('settings-button')).toBeInTheDocument();
  });

  it('renders segment tool as active by default', () => {
    render(<App />);
    const segmentBtn = screen.getByTestId('tool-segment');
    expect(segmentBtn).toBeInTheDocument();
    expect(segmentBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
