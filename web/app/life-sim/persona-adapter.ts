/** AmpliWorld-authored input contract; contains no MatrAIx dataset records. */
export type ConsumerPersona={source:'ampliworld-local';schemaCompatibility:'matraix';dimensions:Partial<Record<'risk_tolerance'|'decision_style'|'lstyle_frugality'|'lstyle_shopping_style'|'att_brand_loyalty'|'att_online_reviews',string>>;personalCareInterest:number;};
export function consumerPersona(index:number):ConsumerPersona{
 return {source:'ampliworld-local',schemaCompatibility:'matraix',dimensions:{risk_tolerance:['Low','Medium','High'][index%3],decision_style:['Analytical','Intuitive','Deliberative'][Math.floor(index/3)%3],lstyle_shopping_style:['Researcher','Impulse buyer','Bargain hunter','Brand loyal','Minimalist'][Math.floor(index/7)%5]},personalCareInterest:((index*61+29)%101)/100};
}
export function authorizePersonaSource(source:string){
 if(source!=='ampliworld-local')throw new Error('External persona import disabled pending applicable dataset rights and provenance review');
}
