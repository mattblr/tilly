import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '~/features/app/SignIn'
export const Route = createFileRoute('/_app/sign-in')({ component: SignIn })
