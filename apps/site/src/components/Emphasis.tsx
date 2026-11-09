import type { EmphasisProps } from '@/types';

export function Emphasis({ text, word }: EmphasisProps) {
  const at = word ? text.indexOf(word) : -1;
  if (!word || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="text-ink">{word}</span>
      {text.slice(at + word.length)}
    </>
  );
}

export function QuietLine({ text, word }: EmphasisProps) {
  return (
    <span className="block text-ink-quiet">
      <Emphasis text={text} word={word} />
    </span>
  );
}
