import { createFileRoute } from '@tanstack/react-router'
import { Feed } from '~/features/app/Feed'
export const Route = createFileRoute('/_app/feed')({ component: Feed })
