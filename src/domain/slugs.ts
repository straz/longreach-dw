// How this app recognizes the records it reads. The API's writes name them (tyapi
// gateway/plans.py, whose tests check its slugs against test8's); only the slugs a screen
// needs to tell apart are read here.

/** Whether a review was recorded from this brief (rev-<brief>-<timestamp>). */
export const isBriefReview = (brief: string, review: string) => review.startsWith(`rev-${brief}-`)

/** Which of a brief's paths an alternative recorded from it stands for (alt-<brief>-<path>-<timestamp>). */
export const pathOfAlternative = <P extends string>(brief: string, alternative: string, paths: readonly P[]): P | undefined =>
  paths.find((p) => alternative.startsWith(`alt-${brief}-${p}-`))

/** The decision a commitment's rationale names when it has no recorded origin yet (tyapi plans.origin_decision_slug). */
export const originDecisionSlug = (commitment: string) => `dec-${commitment}`
