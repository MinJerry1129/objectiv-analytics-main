/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { renderHook } from '@testing-library/react';
import { useOnMountOnce } from '../src';

describe('useOnMountOnce', () => {
  const mockEffectCallback = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should execute once on mount', () => {
    renderHook(() => useOnMountOnce(mockEffectCallback));

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);
  });

  it('should not execute on unmount', () => {
    const { unmount } = renderHook(() => useOnMountOnce(mockEffectCallback));

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);
  });

  it('should not execute on rerender', () => {
    const { rerender } = renderHook(() => useOnMountOnce(mockEffectCallback));

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);

    rerender();
    rerender();
    rerender();

    expect(mockEffectCallback).toHaveBeenCalledTimes(1);
  });
});
