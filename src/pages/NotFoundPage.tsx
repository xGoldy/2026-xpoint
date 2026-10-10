import { LinkButton, PageTitle } from '../components/ui'

export function NotFoundPage() {
  return (
    <>
      <PageTitle subtitle="The page you are looking for does not exist or has moved.">Page not found</PageTitle>
      <LinkButton to="/">Back to the home page</LinkButton>
    </>
  )
}
