import { Link } from 'react-router';
import { PageHeading } from '@/app/PageHeading';

export function NotFoundPage() {
  return (
    <>
      <PageHeading title="Page not found" />
      <p>
        <Link to="/traces" className="underline underline-offset-4">
          Go to traces
        </Link>
      </p>
    </>
  );
}
