import { Box, Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { serviceColor, serviceIcon } from '@/lib/known-services';
import { createDataset } from '@/mocks/seed';

describe('serviceColor', () => {
  it('gives a known service the same colour every time', () => {
    expect(serviceColor('postgres')).toBe(5);
    expect(serviceColor('postgres')).toBe(serviceColor('postgres'));
  });

  it('gives an unknown service the neutral colour', () => {
    expect(serviceColor('billing-v2')).toBe('other');
    // A name that is also a property of every object must not match.
    expect(serviceColor('toString')).toBe('other');
  });

  it('gives every service in the demo data its own colour', () => {
    const services = new Set(
      [...createDataset().spansByTraceId.values()]
        .flat()
        .map((span) => span.service),
    );
    const colors = [...services].map(serviceColor);
    expect(colors).not.toContain('other');
    expect(new Set(colors).size).toBe(services.size);
  });
});

describe('serviceIcon', () => {
  it('gives a known service its icon', () => {
    expect(serviceIcon('postgres')).toBe(Database);
  });

  it('gives an unknown service the plain box', () => {
    expect(serviceIcon('billing-v2')).toBe(Box);
    // A name that is also a property of every object must not match.
    expect(serviceIcon('toString')).toBe(Box);
  });

  it('gives every service in the demo data its own icon', () => {
    const services = new Set(
      [...createDataset().spansByTraceId.values()]
        .flat()
        .map((span) => span.service),
    );
    const icons = [...services].map(serviceIcon);
    expect(icons).not.toContain(Box);
    expect(new Set(icons).size).toBe(services.size);
  });
});
