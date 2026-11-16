import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { SuggestionCard } from '@/components/SuggestionCard';
import { Button } from '@/components/ui/button';
import { BothThemes, Section } from '@/pages/design/design-kit';

/** Buttons, the status and confidence badges, and the suggestion card. */
export function BasicsSections() {
  return (
    <>
      <Section title="Button">
        <BothThemes>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled>Primary, disabled</Button>
            <Button variant="outline" disabled>
              Outline, disabled
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </BothThemes>
      </Section>

      <Section title="Status badge">
        <BothThemes>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <StatusBadge status="ok" />
            <StatusBadge status="error" />
            <StatusBadge status="error" label="Failed" />
          </div>
        </BothThemes>
      </Section>

      <Section title="Confidence badge">
        <BothThemes>
          <div className="space-y-2 text-sm">
            <ConfidenceBadge confidence="high" basis="78% of trace time" />
            <ConfidenceBadge
              confidence="medium"
              basis="a span failed, the request succeeded"
            />
            <ConfidenceBadge
              confidence="low"
              basis="largest span is 18% of trace time"
            />
            <ConfidenceBadge confidence="high" />
          </div>
        </BothThemes>
      </Section>

      <Section title="Suggestion card">
        <BothThemes>
          <SuggestionCard title="Suggested cause" variant="suggestion">
            <p>
              Most of the time is spent in postgres: SELECT orders WHERE user_id
              = ?.
            </p>
            <ConfidenceBadge confidence="high" basis="78% of trace time" />
            <div className="flex flex-wrap gap-2">
              <Button>Accept</Button>
              <Button variant="outline">Edit</Button>
              <Button variant="outline">Reject</Button>
            </div>
          </SuggestionCard>
          <SuggestionCard title="Cause" variant="decided">
            <p>A missing index on orders.user_id.</p>
            <Button variant="outline">Change decision</Button>
          </SuggestionCard>
        </BothThemes>
      </Section>
    </>
  );
}
