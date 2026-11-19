import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Starfield from '../../app/components/Starfield.vue'

describe('Starfield', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes the canvas, animates stars across frames, resizes and cleans up on unmount', async () => {
    const ctx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )

    let nextFrameCallback: FrameRequestCallback | null = null
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      nextFrameCallback = cb
      return 42
    })
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)

    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })

    const wrapper = await mountSuspended(Starfield)
    const canvas = wrapper.find('canvas').element as HTMLCanvasElement

    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    expect(ctx.arc).toHaveBeenCalledTimes(150)
    expect(rafSpy).toHaveBeenCalledTimes(1)

    // Trigger a second frame so stars at y ≈ height wrap back to 0
    expect(nextFrameCallback).not.toBeNull()
    nextFrameCallback?.(16)
    expect(ctx.clearRect).toHaveBeenCalledTimes(2)

    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
    window.dispatchEvent(new Event('resize'))
    expect(canvas.width).toBe(1024)
    expect(canvas.height).toBe(768)

    wrapper.unmount()
    expect(cancelSpy).toHaveBeenCalledWith(42)
  })
})
