/** Stable fictional English display names; resident IDs remain authoritative. */
const first = 'Alex Jordan Taylor Morgan Cameron Casey Jamie Riley Avery Quinn Parker Rowan Logan Dakota Emerson Finley Hayden Jesse Kendall Reese Robin Sam Skyler Sydney Blake Charlie Drew Elliot Harper Jules Lee Max Peyton Remy River Sage Shawn Spencer Terry Adrian Bailey Blair Corey Dana Devon Ellis Frankie Glen Jessey Kelly Lane Leslie Marley Noel Oakley Pat Reagan Rory Sawyer Toby Tracy Valentine Wren Addison Ashton Blairton Chris Dallas Eden Emery Evan'.split(' ');
const last = 'Adams Allen Baker Bell Bennett Brooks Brown Campbell Carter Clark Collins Cooper Davis Edwards Evans Fisher Flores Foster Garcia Gray Green Hall Harris Hayes Hill Howard Hughes Jackson James Johnson Jones Kelly King Lee Lewis Martin Miller Mitchell Moore Morgan Nelson Parker Perez Phillips Reed Roberts Robinson Scott'.split(' ');
export function englishNameFor(id: string): string {
  const index = Number(id.replace(/^R/, '')) - 1;
  if (!Number.isSafeInteger(index) || index < 0) return 'Resident ' + id;
  const family = Math.floor(index / 3);
  return `${first[(index * 17) % first.length]} ${String.fromCharCode(65 + Math.floor(family / last.length) % 26)}. ${last[family % last.length]}`;
}
