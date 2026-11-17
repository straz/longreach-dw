import type { BeliefComparator, TripwireComparator } from '../model/generated.ts'

// A line's comparator, as beliefs and tripwires share it: which side of the
// threshold a value must be on.

export type Comparator = BeliefComparator | TripwireComparator

/** Whether value is on the comparator's side of threshold. */
export function meets(comparator: Comparator, value: number, threshold: number): boolean {
  switch (comparator) {
    case 'ge':
      return value >= threshold
    case 'gt':
      return value > threshold
    case 'le':
      return value <= threshold
    case 'lt':
      return value < threshold
    case 'eq':
      return value === threshold
  }
}

/** The comparator asks for a value at or above its line (ge, gt), not below it. */
export const isAtLeast = (comparator?: Comparator) => comparator === 'ge' || comparator === 'gt'
