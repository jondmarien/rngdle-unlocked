import { FadeIn } from '../motion';

export function ScreenFallback() {
  return (
    <FadeIn>
      <p className="py-10 text-center text-sm text-(--prose-2)">Loading…</p>
    </FadeIn>
  );
}
