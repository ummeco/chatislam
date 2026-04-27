import type { Metadata } from 'next'
import DonateForm from './DonateForm'

export const metadata: Metadata = {
  title: "Support ChatIslam — Keep Islamic AI Free",
  description: "Help keep ChatIslam free for Muslims seeking Islamic guidance. Your donation funds AI infrastructure.",
}

export default function DonatePage() {
  return <DonateForm />
}
