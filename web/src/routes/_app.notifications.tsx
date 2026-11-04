import { createFileRoute } from '@tanstack/react-router'
import { Notifications } from '~/features/app/Notifications'
export const Route = createFileRoute('/_app/notifications')({ component: Notifications })
