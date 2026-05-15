/**
 * LogTab — Camera-first meal logging
 * Wraps the existing MealUpload component in a focused single-purpose screen.
 */
import { MealUpload } from "./MealUpload"

export function LogTab() {
  return (
    <div className="space-y-4">
      <MealUpload />
    </div>
  )
}
