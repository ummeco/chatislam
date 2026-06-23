/**
 * @ummat/ui — Button stories (B1-06)
 * Smoke visual tests for all variants and states.
 * B2-01: a11y addon runs axe on every story automatically.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'light-bg'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Button' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost Button' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Danger Button' },
}

/** D-P3-15: green-600 (#5A9438) on light backgrounds — meets WCAG AA 4.5:1 */
export const LightBg: Story = {
  name: 'Light-bg (D-P3-15)',
  args: { variant: 'light-bg', children: 'Light Background' },
  parameters: { backgrounds: { default: 'white' } },
}

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Loading…' },
}

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
}

export const Small: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { variant: 'primary', size: 'lg', children: 'Large' },
}

export const FullWidth: Story = {
  args: { variant: 'primary', fullWidth: true, children: 'Full Width' },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="primary" loading>Loading</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
}
