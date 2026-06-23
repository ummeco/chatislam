/**
 * @ummat/ui — Modal stories (Q-UI-A-T09)
 * 4+ states: default, with title, custom max-width, content-rich.
 * Verified for role="dialog", aria-modal, focus return on close.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    maxWidth: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

function ModalShell(args: React.ComponentProps<typeof Modal>) {
  const [open, setOpen] = useState(args.open ?? false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal {...args} open={open} onClose={() => setOpen(false)}>
        {args.children}
      </Modal>
    </>
  )
}

export const Default: Story = {
  render: (args) => (
    <ModalShell {...args}>
      <p>Body content for the modal.</p>
    </ModalShell>
  ),
  args: { title: 'Confirm action', open: false },
}

export const Untitled: Story = {
  render: (args) => (
    <ModalShell {...args}>
      <p>Modal with no title — close button still present.</p>
    </ModalShell>
  ),
  args: { open: false },
}

export const WideMaxWidth: Story = {
  name: 'Wide max-width',
  render: (args) => (
    <ModalShell {...args}>
      <p>This dialog uses 56rem max-width for wider content like forms or tables.</p>
    </ModalShell>
  ),
  args: { title: 'Donor record', open: false, maxWidth: '56rem' },
}

export const ContentRich: Story = {
  name: 'Content-rich',
  render: (args) => (
    <ModalShell {...args}>
      <h3>Donation receipt</h3>
      <p>Receipt #UMT-2026-04891</p>
      <ul>
        <li>Charity: Ummat Relief Fund</li>
        <li>Amount: $250.00</li>
        <li>Date: 2026-05-01</li>
        <li>Tax-deductible: yes</li>
      </ul>
      <p>A copy has been emailed to you.</p>
    </ModalShell>
  ),
  args: { title: 'Donation receipt', open: false },
}

export const OpenByDefault: Story = {
  name: 'Open by default',
  render: (args) => (
    <ModalShell {...args}>
      <p>This story opens immediately for axe scanning.</p>
    </ModalShell>
  ),
  args: { title: 'Janazah notification', open: true },
}
