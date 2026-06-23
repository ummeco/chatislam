/**
 * @ummat/ui — Banner stories (Q-UI-A-T09)
 * 4+ variants: info / success / warning / error / offline + dismissible.
 * addon-a11y verifies role/aria-live posture.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Banner } from './Banner'

const meta: Meta<typeof Banner> = {
  title: 'UI/Banner',
  component: Banner,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error', 'offline'] },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Banner>

export const Info: Story = {
  args: { variant: 'info', children: 'Friday prayer schedule updated for Ramadan.' },
}

export const Success: Story = {
  args: { variant: 'success', children: 'Donation receipt sent to your email.' },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Your subscription expires in 7 days. Renew to keep Pro features.',
  },
}

export const Error: Story = {
  args: { variant: 'error', children: 'Payment failed. Please update your card.' },
}

export const Offline: Story = {
  args: { variant: 'offline', children: 'You appear to be offline. Cached prayer times shown.' },
}

export const Dismissible: Story = {
  args: {
    variant: 'info',
    children: 'New feature: Janazah notifications. Enable in settings.',
    onDismiss: () => {},
  },
}
