/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { renderHook } from '@testing-library/react';
import { useOnUnmountOnce } from '../src';

describe('useOnUnmountOnce', () => {
  const mockEffectCallback = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not execute on mount', () => {
    renderHook((effectCallback) => useOnUnmountOnce(effectCallback), { initialProps: mockEffectCallback });

    expect(mockEffectCallback).not.toHaveBeenCalled();
  });

  it('should not execute on rerender', () => {
    const { rerender } = renderHook((effectCallback) => useOnUnmountOnce(effectCallback), {
      initialProps: mockEffectCallback,
    });

    expect(mockEffectCallback).not.toHaveBeenCalled();

    rerender();
    rerender();
    rerender();

    expect(mockEffectCallback).not.toHaveBeenCalled();
  });

  it('should execute on unmount', () => {
    const { unmount } = renderHook((effectCallback) => useOnUnmountOnce(effectCallback), {
      initialProps: mockEffectCallback,
    });

    expect(mockEffectCallback).not.toHaveBeenCalled();

    unmount();

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);
  });

  it('should execute the latest version of the effect callback', () => {
    const mockEffectCallback2 = jest.fn();
    const mockEffectCallback3 = jest.fn();
    const mockEffectCallback4 = jest.fn();
    const { rerender, unmount } = renderHook((effectCallback) => useOnUnmountOnce(effectCallback), {
      initialProps: mockEffectCallback,
    });

    rerender(mockEffectCallback2);
    rerender(mockEffectCallback3);
    rerender(mockEffectCallback4);
    unmount();

    expect(mockEffectCallback).not.toHaveBeenCalled();
    expect(mockEffectCallback2).not.toHaveBeenCalled();
    expect(mockEffectCallback3).not.toHaveBeenCalled();
    expect(mockEffectCallback4).toHaveBeenCalledTimes(1);
  });
});
