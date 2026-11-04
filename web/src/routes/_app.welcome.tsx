import { createFileRoute } from '@tanstack/react-router'
import { Onboarding } from '~/features/app/Onboarding'
export const Route = createFileRoute('/_app/welcome')({
  component: Onboarding,
})
