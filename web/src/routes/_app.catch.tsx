import { createFileRoute } from '@tanstack/react-router'
import { Capture } from '~/features/app/Capture'
export const Route = createFileRoute('/_app/catch')({ component: Capture })
