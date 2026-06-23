/**
 * @ummat/ui — Toast stories (Q-UI-A-T09)
 * 4+ variants: info / success / warning / error + dismissible + no-auto-dismiss.
 * Verifies role="status" vs role="alert" + aria-live polite vs assertive.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    duration: { control: 'number' },
    message: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Toast>

export const Info: Story = {
  args: { variant: 'info', message: 'Prayer times refreshed.', duration: 0 },
}

export const Success: Story = {
  args: { variant: 'success', message: 'Donation receipt sent to your email.', duration: 0 },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    message: 'Your card expires next month. Update payment to keep Pro features.',
    duration: 0,
  },
}

export const Error: Story = {
  args: {
    variant: 'error',
    message: 'Could not save changes. Network error.',
    duration: 0,
  },
}

export const Dismissible: Story = {
  args: {
    variant: 'info',
    message: 'New khutbah scheduled for Friday.',
    duration: 0,
    onClose: () => {},
  },
}

export const AutoDismiss: Story = {
  name: 'Auto-dismiss (3s)',
  args: {
    variant: 'success',
    message: 'Saved. Auto-dismisses in 3 seconds.',
    duration: 3000,
    onClose: () => {},
  },
}
