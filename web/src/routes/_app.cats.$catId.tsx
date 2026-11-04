import { createFileRoute } from '@tanstack/react-router'
import { CatDetail } from '~/features/app/Details'
export const Route = createFileRoute('/_app/cats/$catId')({ component: Page })
function Page() { const { catId } = Route.useParams(); return <CatDetail key={catId} id={catId} /> }
