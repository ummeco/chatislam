/**
 * @ummat/ui — DataState stories (B1-06, B5-01)
 * Smoke test for all 7 UI states.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { DataState } from './DataState'
import { Skeleton } from './Skeleton'

const meta: Meta<typeof DataState> = {
  title: 'UI/DataState',
  component: DataState,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '200px', border: '1px solid #1f4a2e', borderRadius: '8px', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DataState>

export const Loading: Story = {
  args: {
    state: 'loading',
    children: <p>Content hidden during load</p>,
    skeleton: <Skeleton lines={3} />,
  },
}

export const Empty: Story = {
  args: { state: 'empty', children: <p>hidden</p> },
}

export const Error: Story = {
  args: { state: 'error', children: <p>hidden</p> },
}

export const Offline: Story = {
  args: { state: 'offline', children: <p>hidden</p> },
}

export const Success: Story = {
  args: {
    state: 'success',
    children: <p style={{ color: 'var(--color-text-primary)' }}>Content loaded successfully.</p>,
  },
}

export const Partial: Story = {
  args: {
    state: 'partial',
    children: <p style={{ color: 'var(--color-text-primary)' }}>Partial data shown.</p>,
  },
}

export const Stale: Story = {
  args: {
    state: 'stale',
    children: <p style={{ color: 'var(--color-text-primary)' }}>Cached data shown.</p>,
  },
}
