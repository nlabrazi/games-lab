import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GameDetail from '../../app/components/GameDetail.vue'
import GameGrid from '../../app/components/GameGrid.vue'
import { useGames } from '../../app/composables/useGames'
import { type Game, games } from '../../app/data/games'
import IndexPage from '../../app/pages/index.vue'

const navigateToMock = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateToMock)

describe('GameGrid', () => {
  it('renders every catalog game and forwards the select event', async () => {
    const wrapper = await mountSuspended(GameGrid)

    for (const game of games) {
      expect(wrapper.text()).toContain(game.title)
    }

    const cards = wrapper.findAllComponents({ name: 'GameCard' })
    expect(cards).toHaveLength(games.length)

    await cards[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([[games[0]]])
  })
})

describe('GameDetail', () => {
  it('renders nothing when no game is selected', async () => {
    const wrapper = await mountSuspended(GameDetail, {
      props: {
        selectedGame: null,
      },
    })

    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('renders the selected game details and emits back when clicking return', async () => {
    const game = games[0]
    const wrapper = await mountSuspended(GameDetail, {
      props: {
        selectedGame: game,
      },
    })

    expect(wrapper.text()).toContain(game.title)
    expect(wrapper.text()).toContain(game.longDesc)
    expect(wrapper.find('a').attributes('href')).toBe(game.link)

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('back')).toEqual([[]])
  })
})

describe('Home page (index.vue)', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    useGames().clearSelection()
  })

  it('renders the catalog grid, about and contact sections by default', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('// MES JEUX')
    expect(wrapper.text()).toContain('// QUI SUIS-JE ?')
    expect(wrapper.text()).toContain('// CONTACT')
    expect(wrapper.findComponent(GameGrid).exists()).toBe(true)
    expect(wrapper.findComponent(GameDetail).exists()).toBe(false)
  })

  it('navigates when selecting a game with a route link', async () => {
    const wrapper = await mountSuspended(IndexPage)

    wrapper.findComponent(GameGrid).vm.$emit('select', games[0])
    await wrapper.vm.$nextTick()

    expect(navigateToMock).toHaveBeenCalledWith(games[0].link)
    expect(wrapper.findComponent(GameDetail).exists()).toBe(false)
  })

  it('shows GameDetail for placeholder (#) games and returns to the grid on back or empty select', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const placeholderGame: Game = {
      ...games[0],
      id: 99,
      title: 'Prototype Arcade',
      link: '#',
    }

    wrapper.findComponent(GameGrid).vm.$emit('select', placeholderGame)
    await wrapper.vm.$nextTick()

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.findComponent(GameDetail).exists()).toBe(true)
    expect(wrapper.text()).toContain('Prototype Arcade')

    await wrapper.findComponent(GameDetail).find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(GameGrid).exists()).toBe(true)
    expect(wrapper.findComponent(GameDetail).exists()).toBe(false)

    wrapper.findComponent(GameGrid).vm.$emit('select', undefined as unknown as Game)
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(GameDetail).exists()).toBe(false)
  })
})
