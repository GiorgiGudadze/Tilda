import { SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BothThemes, Section } from '@/pages/design/design-kit';

/** What the app shows instead of content: messages, and placeholders. */
export function FeedbackSections() {
  return (
    <>
      <Section title="Popover and toast">
        <p className="max-w-prose text-sm text-muted-foreground">
          These open outside the box they were called from, so they always wear
          the theme of the page.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              toast.error(
                'The decision could not be saved. Nothing was recorded.',
              )
            }
          >
            Show an error toast
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open the popover</Button>
          </PopoverTrigger>
          <PopoverContent aria-label="Sample popover" className="space-y-2">
            <p className="font-medium">A popover</p>
            <p>Escape or a click outside closes it.</p>
          </PopoverContent>
        </Popover>
      </Section>

      <Section title="Empty state">
        <BothThemes>
          <EmptyState
            icon={SearchX}
            title="No traces match these filters"
            description="Try a wider duration range or a different service."
            action={<Button variant="outline">Clear filters</Button>}
          />
          <EmptyState title="No traces in this time" />
        </BothThemes>
      </Section>

      <Section title="Error state">
        <BothThemes>
          <ErrorState
            title="The traces could not be loaded"
            description="The server did not answer."
            onRetry={() => {}}
          />
          <ErrorState title="The trace could not be loaded" />
        </BothThemes>
      </Section>

      <Section title="Skeleton">
        <BothThemes>
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-24 w-full" />
        </BothThemes>
      </Section>
    </>
  );
}
