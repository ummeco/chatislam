/**
 * @ummat/ui — Avatar stories (Q-UI-A-T09)
 * 4+ variants per acceptance: default-image, fallback-initials, size scale, single-name fallback.
 * addon-a11y runs axe on every story automatically.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    name: { control: 'text' },
    src: { control: 'text' },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: { name: 'Aisha Rahman', size: 'md' },
}

export const WithImage: Story = {
  args: {
    name: 'Aisha Rahman',
    src: 'https://i.pravatar.cc/150?u=ummat-avatar-1',
    size: 'md',
  },
}

export const FallbackInitials: Story = {
  name: 'Fallback (initials)',
  args: { name: 'Yusuf Ali Khan', size: 'md' },
}

export const SingleName: Story = {
  args: { name: 'Hamza', size: 'md' },
}

export const NoName: Story = {
  args: { size: 'md', label: 'Unknown user' },
}

export const BrokenImageFallback: Story = {
  name: 'Broken image fallback',
  args: { name: 'Mariam Siddiqui', src: '/this-image-does-not-exist.png', size: 'md' },
}

export const SizeScale: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <Avatar name="A B" size="xs" />
      <Avatar name="A B" size="sm" />
      <Avatar name="A B" size="md" />
      <Avatar name="A B" size="lg" />
      <Avatar name="A B" size="xl" />
    </div>
  ),
}
