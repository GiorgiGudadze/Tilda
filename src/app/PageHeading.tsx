/**
 * The one `h1` of a page. It also names the browser tab: React 19 moves a
 * `<title>` rendered anywhere into the document's head.
 *
 * `tabIndex={-1}` lets the layout move focus here when the page changes,
 * without putting the heading in the tab order.
 */
export function PageHeading({ title }: { title: string }) {
  return (
    <>
      <title>{`${title} · Trace Investigator`}</title>
      <h1 tabIndex={-1} className="rounded-sm text-2xl font-semibold">
        {title}
      </h1>
    </>
  );
}
