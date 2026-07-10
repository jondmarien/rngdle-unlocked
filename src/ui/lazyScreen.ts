import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** Lazy-load a named screen export for route-level code splitting. */
export function lazyScreen<Props = Record<string, unknown>>(
  loader: () => Promise<Record<string, ComponentType<Props>>>,
  exportName: string,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(async () => {
    const mod = await loader();
    const Component = mod[exportName];
    if (!Component) {
      throw new Error(`lazyScreen: missing export "${exportName}"`);
    }
    return { default: Component };
  });
}
