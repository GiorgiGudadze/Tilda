import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CAUSE_MAX_LENGTH } from '@/features/suggestion/schemas';

interface CauseFormProps {
  /** The AI's text to start from, or empty to write a cause from scratch. */
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/**
 * The form for writing the cause in your own words. A cause is required and
 * has a length limit. An error is shown under the field and tied to it.
 */
export function CauseForm({ initialText, onSave, onCancel }: CauseFormProps) {
  const [text, setText] = useState(initialText);
  // Errors show after the first try to save, then follow the text.
  const [tried, setTried] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const countId = useId();
  const errorId = useId();

  // The form opens because the user asked to write, so start in the field.
  useEffect(() => field.current?.focus(), []);

  const cause = text.trim();
  const tooLongBy = cause.length - CAUSE_MAX_LENGTH;
  const error =
    cause === ''
      ? 'Write a cause, or cancel.'
      : tooLongBy > 0
        ? `The cause is ${tooLongBy} ${tooLongBy === 1 ? 'character' : 'characters'} too long.`
        : null;
  // Too long is shown at once: the counter already says so.
  const shownError = tried || tooLongBy > 0 ? error : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (error) {
      setTried(true);
      field.current?.focus();
      return;
    }
    onSave(cause);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-1.5">
      <label htmlFor={fieldId} className="font-medium">
        Cause
      </label>
      <Textarea
        ref={field}
        id={fieldId}
        rows={4}
        required
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={shownError !== null}
        aria-describedby={shownError ? `${errorId} ${countId}` : countId}
      />
      <div className="flex justify-between gap-3 text-xs">
        <p id={errorId} className="font-medium text-destructive">
          {shownError}
        </p>
        <p id={countId} className="text-muted-foreground tabular-nums">
          {cause.length} of {CAUSE_MAX_LENGTH} characters
        </p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit">Save cause</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
