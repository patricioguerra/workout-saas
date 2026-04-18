export type Category = 'athx' | 'athx_pro'

export type Sex = 'male' | 'female' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  age: number | null
  weight: number | null
  sex: Sex | null
  category: Category | null
  avatar_url: string | null
  rm_strict_press: number | null
  rm_back_squat: number | null
  rm_deadlift: number | null
  run_5k_minutes: number | null
  onboarding_completed: boolean
  cycle_start_date: string | null
}

export function isCategory(value: string): value is Category {
  return value === 'athx' || value === 'athx_pro'
}
