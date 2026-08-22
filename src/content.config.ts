import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    routeSlug: z.string(),
    canonical: z.string().url(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    category: z.string(),
    track: z.enum(['business', 'careers', 'teaching', 'builders']).default('business'),
    jobToBeDone: z.string().default('Understand the topic and decide a responsible next step.'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    estimatedMinutes: z.number().int().positive().default(8),
    outcomes: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    reviewStatus: z.enum(['source-preserved', 'in-review', 'reviewed', 'high-stakes-hold']).default('source-preserved'),
    audience: z.string().default('professional'),
    author: z.string().default('AI Amigos Editorial Desk'),
    reviewer: z.string().optional(),
    reviewedAt: z.string().optional(),
    nextReviewAt: z.string().optional(),
    lastTestedAt: z.string().optional(),
    changeLog: z.array(z.object({ date: z.string(), summary: z.string() })).default([]),
    relatedTools: z.array(z.string()).default([]),
    relatedTemplates: z.array(z.string()).default([]),
    status: z.enum(['published', 'draft', 'retire', 'merge']),
    disposition: z.enum(['retain', 'update', 'merge', 'retire', 'draft']),
    originalUrl: z.string().url(),
    sources: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([]),
    disclosure: z.string().optional(),
    hero: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
});

export const collections = { articles };
