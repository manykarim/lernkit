import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * Content collections.
 *
 * Phase 0 keeps Starlight's built-in `docs` schema. Phase 1 will extend it with
 * Lernkit-specific frontmatter (objectives, mastery criteria, estimated duration,
 * cmi5 moveOn), per the Authoring context in docs/ddd/03-context-models/authoring.md.
 */
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Phase 1 will fill this in. For now we allow optional tagging.
        objectives: z.array(z.string()).optional(),
        estimatedMinutes: z.number().int().positive().optional(),
      }),
    }),
  }),
};
