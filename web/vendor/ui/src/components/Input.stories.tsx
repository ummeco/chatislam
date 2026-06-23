/**
 * @ummat/ui — Input stories (Q-UI-A-T09)
 * 6+ states: default, with label, with hint, error, disabled, prefix/suffix, full width.
 * addon-a11y verifies label/error associations + aria-describedby.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: 'Search masjids' },
}

export const WithLabel: Story = {
  name: 'With label',
  args: { label: 'Email', placeholder: 'you@example.com', type: 'email' },
}

export const WithHint: Story = {
  name: 'With hint',
  args: {
    label: 'Hijri date offset',
    hint: 'Some regions use ±1 day from Umm al-Qura.',
    placeholder: '0',
  },
}

export const Error: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    type: 'email',
    error: 'Email format is invalid.',
    defaultValue: 'not-an-email',
  },
}

export const Disabled: Story = {
  args: { label: 'Locked field', placeholder: 'You cannot edit this', disabled: true },
}

export const WithPrefixSuffix: Story = {
  name: 'With prefix / suffix',
  args: {
    label: 'Donation amount',
    prefixEl: <span>$</span>,
    suffixEl: <span>USD</span>,
    placeholder: '25',
    type: 'number',
  },
}

export const FullWidth: Story = {
  name: 'Full width',
  args: {
    label: 'Bio',
    placeholder: 'Tell the community about yourself',
    fullWidth: true,
  },
}
