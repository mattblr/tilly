import { createFileRoute } from '@tanstack/react-router'
import { WorldMap } from '~/features/app/Map'
export const Route = createFileRoute('/_app/map')({ component: WorldMap })
