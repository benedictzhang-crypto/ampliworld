import type { Resident } from './engine';

export type FoodGood = 'bread' | 'protein' | 'sugar' | 'fruit';
export type FoodPrices = Record<FoodGood, number>;
export type FoodBasket = Record<FoodGood, number> & { costCents: number };

export const BASE_FOOD_PRICES: FoodPrices = {
  bread: 200,
  protein: 800,
  sugar: 100,
  fruit: 300,
};

/** A bounded daily grocery envelope, not a claim about observed food spending. */
export function foodBudgetForResident(resident: Resident): number {
  return Math.max(
    0,
    Math.min(
      resident.cash,
      2_600,
      Math.floor((resident.cash + resident.savings) * 0.1),
    ),
  );
}

export function foodPreferenceForResident(resident: Resident) {
  const personality = resident.identity?.personality;
  const sweetTooth = Math.min(
    1,
    Math.max(
      0,
      ((Number(resident.id.slice(1)) * 37) % 100) / 100 + resident.stress / 500,
    ),
  );
  const freshFood = Math.min(
    1,
    Math.max(
      0,
      (personality?.conscientiousness ?? 50) / 100 +
        (resident.adaptivePolicy?.freshFoodAffinity || 0) * 0.2,
    ),
  );
  return { sweetTooth, freshFood };
}

/**
 * Three-meal scenario: secure two cheap staple portions, then choose protein
 * if affordable; otherwise fill the calorie gap with another staple portion.
 * Only the remaining budget can buy sweets or fruit. This permits, but never
 * forces, Giffen-like staple demand in a narrow subsistence budget band.
 */
export function planFoodBasket(
  budgetCents: number,
  prices: FoodPrices,
  preference: { sweetTooth: number; freshFood: number },
): FoodBasket {
  const quantities = { bread: 0, protein: 0, sugar: 0, fruit: 0 };
  let left = Math.max(0, Math.floor(budgetCents));
  for (let i = 0; i < 2 && left >= prices.bread; i++) {
    quantities.bread++;
    left -= prices.bread;
  }
  if (quantities.bread === 2 && left >= prices.protein) {
    quantities.protein++;
    left -= prices.protein;
    if (budgetCents >= 2_200 && left >= prices.protein) {
      quantities.protein++;
      left -= prices.protein;
    }
  } else if (left >= prices.bread) {
    quantities.bread++;
    left -= prices.bread;
  }
  if (preference.sweetTooth >= 0.55) {
    while (quantities.sugar < 3 && left >= prices.sugar) {
      quantities.sugar++;
      left -= prices.sugar;
    }
  }
  if (preference.freshFood >= 0.5 && left >= prices.fruit) {
    quantities.fruit++;
    left -= prices.fruit;
  }
  return {
    ...quantities,
    costCents: Math.max(0, Math.floor(budgetCents)) - left,
  };
}

export function residentFoodBasket(
  resident: Resident,
  prices: FoodPrices,
): FoodBasket {
  return planFoodBasket(
    foodBudgetForResident(resident),
    prices,
    foodPreferenceForResident(resident),
  );
}
