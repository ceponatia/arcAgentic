import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFetchOnce } from './useFetchOnce.js';

describe('useFetchOnce', () => {
  it('returns loading first and then data on success', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 'ready' });

    const { result } = renderHook(() =>
      useFetchOnce({
        fetcher,
        mapData: (raw: { value: string }) => raw.value,
      })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('ready');
  });

  it('returns an error string when the fetch fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Backend unavailable'));

    const { result } = renderHook(() => useFetchOnce({ fetcher }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Backend unavailable');
    expect(result.current.data).toBeNull();
  });

  it('retry re-fetches data after a failure', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('Try again'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => useFetchOnce({ fetcher }));

    await waitFor(() => {
      expect(result.current.error).toBe('Try again');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('success');
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('applies mapData to the fetched response', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 2 });

    const { result } = renderHook(() =>
      useFetchOnce({
        fetcher,
        mapData: (raw: { count: number }) => raw.count * 10,
      })
    );

    await waitFor(() => {
      expect(result.current.data).toBe(20);
    });
  });

  it('aborts the active request on unmount', async () => {
    let receivedSignal: AbortSignal | null = null;
    const fetcher = vi.fn(
      (signal: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          receivedSignal = signal;
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const { unmount } = renderHook(() => useFetchOnce({ fetcher }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });
});
