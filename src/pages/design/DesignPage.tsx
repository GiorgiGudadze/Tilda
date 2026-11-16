import { BasicsSections } from '@/pages/design/sections/basics';
import { ChartsSections } from '@/pages/design/sections/charts';
import { FeedbackSections } from '@/pages/design/sections/feedback';
import { FormsSections } from '@/pages/design/sections/forms';
import { TokensSections } from '@/pages/design/sections/tokens';
import { TracesSections } from '@/pages/design/sections/traces';

/**
 * The colour tokens and every library component, in each state and in both
 * themes. Each family of components is in its own file under `sections/`.
 */
export function DesignPage() {
  return (
    <>
      <p className="max-w-prose text-muted-foreground">
        The colour tokens and the components this app is built from, each in
        every state and in both themes. Components take plain props and know
        nothing about the API.
      </p>
      <TokensSections />
      <BasicsSections />
      <TracesSections />
      <FormsSections />
      <ChartsSections />
      <FeedbackSections />
    </>
  );
}
