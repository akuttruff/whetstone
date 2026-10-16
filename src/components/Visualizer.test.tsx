import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Visualizer from './Visualizer.tsx'
import { vizFor } from '../viz/index.ts'

describe('Visualizer', () => {
  it('steps through frames with the buttons and the keyboard', async () => {
    const user = userEvent.setup()
    const viz = vizFor('monotonic-deque')!
    render(<Visualizer viz={viz} />)
    expect(screen.getByText(`1 / ${viz.frames.length}`)).toBeInTheDocument()
    expect(screen.getByText(viz.frames[0]!.caption)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(`2 / ${viz.frames.length}`)).toBeInTheDocument()
    expect(screen.getByText(viz.frames[1]!.caption)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Last step' }))
    expect(screen.getByText(`${viz.frames.length} / ${viz.frames.length}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'First step' }))
    const box = screen.getByLabelText('Visualisation')
    box.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByText(`3 / ${viz.frames.length}`)).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(`2 / ${viz.frames.length}`)).toBeInTheDocument()
  })

  it('renders grid and graph scenes', () => {
    const { container, rerender } = render(<Visualizer viz={vizFor('flood-fill')!} />)
    expect(container.querySelector('.viz-grid')).toBeInTheDocument()
    rerender(<Visualizer viz={vizFor('topo-sort')!} />)
    expect(container.querySelector('svg.viz-graph')).toBeInTheDocument()
    expect(container.querySelectorAll('.viz-node').length).toBe(6)
  })
})
