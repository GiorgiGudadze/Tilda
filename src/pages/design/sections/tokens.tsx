import {
  SERVICE_BACKGROUNDS,
  SERVICE_COLORS,
} from '@/components/service-colors';
import { cn } from '@/lib/utils';
import { BothThemes, Section } from '@/pages/design/design-kit';

/** Token groups. Class names are written in full so Tailwind can find them. */
const TOKEN_GROUPS = [
  {
    title: 'Surfaces',
    tokens: [
      { name: 'background', className: 'bg-background' },
      { name: 'card', className: 'bg-card' },
      { name: 'muted', className: 'bg-muted' },
    ],
  },
  {
    title: 'Text and the primary action',
    tokens: [
      { name: 'foreground', className: 'bg-foreground' },
      { name: 'muted-foreground', className: 'bg-muted-foreground' },
      { name: 'primary', className: 'bg-primary' },
    ],
  },
  {
    title: 'Lines',
    tokens: [
      { name: 'border', className: 'bg-border' },
      { name: 'input', className: 'bg-input' },
      { name: 'ring', className: 'bg-ring' },
    ],
  },
  {
    title: 'Status',
    tokens: [
      { name: 'success', className: 'bg-success' },
      { name: 'destructive', className: 'bg-destructive' },
    ],
  },
  {
    title: 'Services',
    tokens: SERVICE_COLORS.map((color) => ({
      name: `service-${color}`,
      className: SERVICE_BACKGROUNDS[color],
    })),
  },
];

export function TokensSections() {
  return (
    <Section title="Colour tokens">
      <BothThemes>
        {TOKEN_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-sm font-medium">{group.title}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.tokens.map((token) => (
                <li key={token.name} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-6 shrink-0 rounded-md border',
                      token.className,
                    )}
                  />
                  <code className="text-xs">{token.name}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </BothThemes>
    </Section>
  );
}
