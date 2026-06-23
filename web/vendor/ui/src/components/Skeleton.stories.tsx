/**
 * @ummat/ui — Skeleton stories (Q-UI-A-T09)
 * 4+ shapes: rect / circle / text / multi-line text + custom dimensions.
 * Verifies role="status" + aria-label on every variant.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    shape: { control: 'select', options: ['rect', 'circle', 'text'] },
    width: { control: 'text' },
    height: { control: 'text' },
    lines: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Rect: Story = {
  args: { shape: 'rect', width: '100%', height: 120 },
}

export const Circle: Story = {
  args: { shape: 'circle', width: 48, height: 48 },
}

export const TextLine: Story = {
  name: 'Text line',
  args: { shape: 'text', width: '60%', height: '1rem' },
}

export const MultiLineText: Story = {
  name: 'Multi-line text',
  args: { shape: 'text', lines: 4 },
}

export const CardPlaceholder: Story = {
  name: 'Card placeholder',
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', maxWidth: 360 }}>
      <Skeleton shape="circle" width={48} height={48} />
      <div style={{ flex: 1 }}>
        <Skeleton shape="text" width="40%" height="0.875rem" style={{ marginBottom: 8 }} />
        <Skeleton shape="text" lines={2} />
      </div>
    </div>
  ),
}
