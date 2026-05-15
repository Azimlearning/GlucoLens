import type { NutritionItem } from "@/lib/types"

interface MealBreakdownProps {
  items: NutritionItem[]
}

export function MealBreakdown({ items }: MealBreakdownProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Name</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Calories</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Carbs</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Protein</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">Fat</th>
            <th className="pb-2 pr-4 font-medium text-slate-500 text-xs whitespace-nowrap">GI</th>
            <th className="pb-2 font-medium text-slate-500 text-xs whitespace-nowrap">GL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-2 pr-4 text-slate-800 font-medium whitespace-nowrap">{item.name}</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{item.calories}</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{item.carbs_g}g</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{item.protein_g}g</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{item.fat_g}g</td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{item.gi}</td>
              <td className="py-2 text-slate-600 whitespace-nowrap">{item.gl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
