import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { type UseFullscreenOptions, useFullscreen } from '../../app/composables/useFullscreen'

async function mountUseFullscreen(options?: UseFullscreenOptions) {
  let state!: ReturnType<typeof useFullscreen>
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        state = useFullscreen(options)
        return () => null
      },
    }),
  )
  return { ...state, wrapper }
}

describe('useFullscreen', () => {
  let originalFullscreenEnabled: PropertyDescriptor | undefined
  let originalFullscreenElement: PropertyDescriptor | undefined

  beforeEach(() => {
    originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled')
    originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
  })

  afterEach(() => {
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabled)
    }
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement)
    }
    vi.restoreAllMocks()
  })

  it('reports support and initial non-fullscreen state', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: true,
      configurable: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    })

    const { isFullscreen, isSupported, wrapper } = await mountUseFullscreen()

    expect(isSupported.value).toBe(true)
    expect(isFullscreen.value).toBe(false)
    wrapper.unmount()
  })

  it('calls requestFullscreen when entering fullscreen', async () => {
    const requestFullscreenSpy = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = requestFullscreenSpy

    const { enterFullscreen, wrapper } = await mountUseFullscreen()
    await enterFullscreen()

    expect(requestFullscreenSpy).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('calls exitFullscreen when exiting fullscreen', async () => {
    const exitFullscreenSpy = vi.fn().mockResolvedValue(undefined)
    document.exitFullscreen = exitFullscreenSpy

    const { exitFullscreen, wrapper } = await mountUseFullscreen()
    await exitFullscreen()

    expect(exitFullscreenSpy).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('toggles fullscreen state correctly', async () => {
    const requestFullscreenSpy = vi.fn().mockResolvedValue(undefined)
    const exitFullscreenSpy = vi.fn().mockResolvedValue(undefined)

    document.documentElement.requestFullscreen = requestFullscreenSpy
    document.exitFullscreen = exitFullscreenSpy

    const { isFullscreen, toggleFullscreen, wrapper } = await mountUseFullscreen()

    // Initialement false -> appelle enterFullscreen
    isFullscreen.value = false
    await toggleFullscreen()
    expect(requestFullscreenSpy).toHaveBeenCalled()

    // Lorsque true -> appelle exitFullscreen
    isFullscreen.value = true
    await toggleFullscreen()
    expect(exitFullscreenSpy).toHaveBeenCalled()
    wrapper.unmount()
  })
})
