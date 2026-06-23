/**
 * @ummat/ui — Card stories (Q-UI-A-T09)
 * 4+ variants per acceptance: default / elevated / outlined / glass + interactive + with header/body/footer.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardBody, CardFooter } from './Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'elevated', 'outlined', 'glass'] },
    interactive: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: { variant: 'default', children: 'Default card surface' },
}

export const Elevated: Story = {
  args: { variant: 'elevated', children: 'Elevated card with shadow' },
}

export const Outlined: Story = {
  args: { variant: 'outlined', children: 'Outlined card with border only' },
}

export const Glass: Story = {
  args: { variant: 'glass', children: 'Glass card with backdrop blur' },
}

export const Interactive: Story = {
  args: {
    variant: 'elevated',
    interactive: true,
    children: 'Interactive — focusable + clickable',
  },
}

export const WithHeaderBodyFooter: Story = {
  name: 'With header / body / footer',
  render: () => (
    <Card variant="elevated" style={{ width: 360 }}>
      <CardHeader>
        <strong>Jumu'ah at Conneaut Masjid</strong>
      </CardHeader>
      <CardBody>
        Khutbah begins at 1:15 PM. Salah follows at 1:45 PM. Guest khateeb: Imam Yusuf.
      </CardBody>
      <CardFooter>
        <button type="button">Add to calendar</button>
      </CardFooter>
    </Card>
  ),
}
