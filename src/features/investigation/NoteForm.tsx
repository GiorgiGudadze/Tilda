import { type FormEvent, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveNote } from '@/features/investigation/hooks';
import { NOTE_MAX_LENGTH, type Pin } from '@/features/investigation/schemas';

/**
 * The note of one pin. It is saved with the Save button, never by itself.
 * A note is optional, so an empty one can be saved to clear it.
 */
export function NoteForm({ pin }: { pin: Pin }) {
  // The text lives here while it is typed. It starts from the saved note and
  // is never copied from the server again, so a refetch cannot reset it.
  const [text, setText] = useState(pin.note);
  const save = useSaveNote();
  const field = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const countId = useId();
  const errorId = useId();

  const tooLongBy = text.length - NOTE_MAX_LENGTH;
  const tooLong = tooLongBy > 0;
  const changed = text !== pin.note;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (tooLong) {
      field.current?.focus();
      return;
    }
    save.mutate({ trace: pin.trace, note: text });
  }

  return (
    <form onSubmit={submit} className="space-y-1.5 text-sm">
      <label htmlFor={fieldId} className="font-medium">
        Note
      </label>
      <Textarea
        ref={field}
        id={fieldId}
        // Several notes can be on one page, so each names its trace.
        aria-label={`Note for ${pin.trace.operation}`}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={tooLong}
        aria-describedby={tooLong ? `${errorId} ${countId}` : countId}
        placeholder="What you found, and what you told the team"
      />
      <div className="flex justify-between gap-3 text-xs">
        <p id={errorId} className="font-medium text-destructive">
          {tooLong &&
            `The note is ${tooLongBy} ${tooLongBy === 1 ? 'character' : 'characters'} too long.`}
        </p>
        <p id={countId} className="text-muted-foreground tabular-nums">
          {text.length} of {NOTE_MAX_LENGTH} characters
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={!changed || save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save note'}
        </Button>
        {/* Announced when the note is saved. */}
        <p aria-live="polite" className="text-muted-foreground">
          {save.isSuccess && !changed && 'Saved'}
        </p>
        {save.isError && changed && (
          <p role="alert" className="text-destructive">
            The note was not saved. Your text is still here.{' '}
            <button type="submit" className="font-medium underline">
              Retry
            </button>
          </p>
        )}
      </div>
    </form>
  );
}
