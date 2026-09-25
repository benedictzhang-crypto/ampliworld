import assert from 'node:assert/strict';
import {
  CITY_FACILITY_STANDARD,
  CITY_STANDARD_EMPLOYED_RESIDENTS,
  CITY_STANDARD_POPULATION,
  HOSPITAL_DEPARTMENT_PLAN,
  RESTAURANT_CUISINE_PLAN,
  RESTAURANT_TIER_PLAN,
  WORKFORCE_SECTOR_TARGETS,
  countPlanTotal,
} from '../app/life-sim/city-capacity-standard';
import {CITY_SERVICE_PLAN} from '../app/life-sim/city-service-plan';
import {FOOD_VENUES} from '../app/world-client/retail-registry';
import {HOSPITALITY} from '../app/life-sim/commerce';

const restaurantKinds=new Set([
  'signature-restaurant','premium-restaurant','upper-restaurant',
  'mid-restaurant','value-restaurant','small-restaurant',
]);
const plannedStreetRestaurants=CITY_SERVICE_PLAN
  .filter(service=>restaurantKinds.has(service.kind))
  .reduce((total,service)=>total+service.count,0);
const operatingRestaurantLicences=plannedStreetRestaurants+
  HOSPITALITY.filter(site=>site.type==='restaurant').length+
  FOOD_VENUES.length;

assert.equal(CITY_STANDARD_POPULATION,30_000);
assert.equal(countPlanTotal(RESTAURANT_TIER_PLAN),200,'restaurant tiers must cover every licence');
assert.equal(countPlanTotal(RESTAURANT_CUISINE_PLAN),200,'restaurant cuisines must cover every licence');
assert.equal(operatingRestaurantLicences,200,'physical restaurant registry must match the operating standard');
assert.equal(countPlanTotal(HOSPITAL_DEPARTMENT_PLAN),1250,'hospital departments must match hospital staffing');
assert.equal(countPlanTotal(WORKFORCE_SECTOR_TARGETS),CITY_STANDARD_EMPLOYED_RESIDENTS,'workforce sectors must cover the employed population');
assert.equal(new Set(CITY_FACILITY_STANDARD.map(item=>item.id)).size,CITY_FACILITY_STANDARD.length,'facility ids must be unique');
for(const facility of CITY_FACILITY_STANDARD){
  assert.ok(facility.sites>0,`${facility.id} needs a physical site`);
  assert.ok(facility.typicalStaff[0]>0&&facility.typicalStaff[1]>=facility.typicalStaff[0],`${facility.id} staffing range is invalid`);
  assert.ok(facility.roles.length>0,`${facility.id} needs explicit roles`);
}

console.log(JSON.stringify({
  population:CITY_STANDARD_POPULATION,
  operatingRestaurantLicences,
  cuisines:RESTAURANT_CUISINE_PLAN.length,
  hospitalDepartments:HOSPITAL_DEPARTMENT_PLAN.length,
  hospitalStaff:countPlanTotal(HOSPITAL_DEPARTMENT_PLAN),
  facilityClasses:CITY_FACILITY_STANDARD.length,
  workforceTarget:countPlanTotal(WORKFORCE_SECTOR_TARGETS),
},null,2));
