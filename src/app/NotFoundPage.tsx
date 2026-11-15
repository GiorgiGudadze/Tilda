import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>
        <Link to="/traces" className="underline underline-offset-4">
          Go to traces
        </Link>
      </p>
    </>
  );
}
