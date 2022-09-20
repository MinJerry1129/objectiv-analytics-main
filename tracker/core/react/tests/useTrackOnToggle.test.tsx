/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { makeHiddenEvent, makeVisibleEvent, Tracker } from '@objectiv/tracker-core';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { useEffect, useState } from 'react';
import { TrackerProvider, useTrackOnToggle } from '../src';

describe('useTrackOnToggle', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const LogTransport = { transportName: 'LogTransport', handle: jest.fn(), isUsable: () => true };
  const renderSpy = jest.fn();
  const tracker = new Tracker({ applicationId: 'app-id', transport: LogTransport });

  const Index = () => {
    return (
      <TrackerProvider tracker={tracker}>
        <Application />
      </TrackerProvider>
    );
  };

  const Menu = () => (
    <ul>
      <li>Menu1</li>
      <li>Menu2</li>
      <li>Menu3</li>
    </ul>
  );

  const Application = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    useTrackOnToggle({ state: menuOpen, trueEvent: makeVisibleEvent(), falseEvent: makeHiddenEvent() });

    useEffect(renderSpy);

    return (
      <>
        Test application
        {menuOpen ? <Menu /> : null}
        <button data-testid="toggle-menu" onClick={() => setMenuOpen(!menuOpen)} value="Toggle Menu" />
      </>
    );
  };

  it('should not execute on mount', () => {
    render(<Index />);

    expect(LogTransport.handle).not.toHaveBeenCalled();
  });

  it('should not execute on unmount', () => {
    const { unmount } = render(<Index />);

    unmount();

    expect(LogTransport.handle).not.toHaveBeenCalled();
  });

  it('should not execute on rerender', () => {
    const { rerender } = render(<Index />);

    rerender(<Index />);
    rerender(<Index />);

    expect(renderSpy).toHaveBeenCalledTimes(3);
    expect(LogTransport.handle).not.toHaveBeenCalled();
  });

  it('should execute on state change', () => {
    render(<Index />);

    const toggleMenuButton = screen.getByTestId('toggle-menu');

    fireEvent.click(toggleMenuButton);
    fireEvent.click(toggleMenuButton);
    fireEvent.click(toggleMenuButton);

    expect(LogTransport.handle).toHaveBeenCalledTimes(3);
    expect(LogTransport.handle).toHaveBeenNthCalledWith(1, expect.objectContaining({ _type: 'VisibleEvent' }));
    expect(LogTransport.handle).toHaveBeenNthCalledWith(2, expect.objectContaining({ _type: 'HiddenEvent' }));
    expect(LogTransport.handle).toHaveBeenNthCalledWith(3, expect.objectContaining({ _type: 'VisibleEvent' }));
  });

  it('should allow overriding the tracker with a custom one', () => {
    const LogTransport2 = { transportName: 'LogTransport2', handle: jest.fn(), isUsable: () => true };
    const anotherTracker = new Tracker({ applicationId: 'app-id', transport: LogTransport2 });
    const { rerender } = renderHook(
      (state) =>
        useTrackOnToggle({
          state,
          trueEvent: makeVisibleEvent(),
          falseEvent: makeHiddenEvent(),
          tracker: anotherTracker,
        }),
      { initialProps: false }
    );

    rerender(true);
    rerender(false);

    expect(LogTransport.handle).not.toHaveBeenCalled();
    expect(LogTransport2.handle).toHaveBeenCalledTimes(2);
    expect(LogTransport2.handle).toHaveBeenNthCalledWith(1, expect.objectContaining({ _type: 'VisibleEvent' }));
    expect(LogTransport2.handle).toHaveBeenNthCalledWith(2, expect.objectContaining({ _type: 'HiddenEvent' }));
  });

  it('should allow omitting the false event', () => {
    const LogTransport2 = { transportName: 'LogTransport2', handle: jest.fn(), isUsable: () => true };
    const anotherTracker = new Tracker({ applicationId: 'app-id', transport: LogTransport2 });
    const { rerender } = renderHook(
      (state) =>
        useTrackOnToggle({
          state,
          trueEvent: makeVisibleEvent(),
          tracker: anotherTracker,
        }),
      { initialProps: false }
    );

    rerender(true);
    rerender(false);

    expect(LogTransport.handle).not.toHaveBeenCalled();
    expect(LogTransport2.handle).toHaveBeenCalledTimes(2);
    expect(LogTransport2.handle).toHaveBeenNthCalledWith(1, expect.objectContaining({ _type: 'VisibleEvent' }));
    expect(LogTransport2.handle).toHaveBeenNthCalledWith(2, expect.objectContaining({ _type: 'VisibleEvent' }));
  });
});
