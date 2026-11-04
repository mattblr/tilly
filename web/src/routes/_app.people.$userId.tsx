import { createFileRoute } from '@tanstack/react-router'
import { ProfileDetail } from '~/features/app/Details'
export const Route = createFileRoute('/_app/people/$userId')({ component: Page })
function Page() { const { userId } = Route.useParams(); return <ProfileDetail key={userId} id={userId} /> }
