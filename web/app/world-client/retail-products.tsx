import type {Product} from './mall-retail-catalog';
const Box=({p,s,color}:{p:[number,number,number];s:[number,number,number];color:string})=><mesh position={p} castShadow><boxGeometry args={s}/><meshStandardMaterial color={color} roughness={.6}/></mesh>;
/** The same SKU silhouette is used on the window plinth and in the wardrobe UI. */
export function ProductModel({product:p}:{product:Product}){
  if(p.slot==='top')return <group>
    <Box p={[0,.48,0]} s={[.5,.72,.16]} color={p.color}/>
    {[-1,1].map(sign=><group key={sign} position={[sign*.32,.54,0]} rotation={[0,0,sign*.20]}><Box p={[0,0,0]} s={[.16,.60,.15]} color={p.color}/></group>)}
    {p.shape==='jacket'&&[-1,1].map(sign=><group key={sign} position={[sign*.10,.73,.10]} rotation={[0,0,sign*.35]}><Box p={[0,0,0]} s={[.11,.32,.04]} color={p.trim}/></group>)}
    <Box p={[0,.51,.10]} s={[.014,.56,.015]} color={p.trim}/>
    {[-.15,.15].map(dx=><Box key={dx} p={[dx,.30,.10]} s={[.14,.09,.03]} color={p.trim}/>)}
  </group>;
  if(p.slot==='bottom')return <group><Box p={[0,.80,0]} s={[.43,.16,.20]} color={p.color}/>{[-.12,.12].map(dx=><Box key={dx} p={[dx,.41,0]} s={[.18,.75,.18]} color={p.color}/>)}</group>;
  if(p.slot==='shoes')return <group>{[-.15,.15].map(dx=><group key={dx}><Box p={[dx,.06,.04]} s={[.24,.10,.45]} color={p.trim}/><mesh position={[dx,.16,0]} scale={[.12,.13,.22]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color={p.color}/></mesh>{[0,.07,.14].map(z=><Box key={z} p={[dx,.23,z]} s={[.14,.016,.025]} color={p.trim}/>)}</group>)}</group>;
  if(p.slot==='bag')return <group><Box p={[0,.26,0]} s={[.48,.42,.17]} color={p.color}/><Box p={[0,.31,.10]} s={[.08,.06,.03]} color={p.trim}/><mesh position={[0,.55,0]}><torusGeometry args={[.15,.022,6,18,Math.PI]}/><meshStandardMaterial color={p.trim} metalness={.7} roughness={.3}/></mesh></group>;
  return <group><mesh position={[0,.2,0]}><sphereGeometry args={[.22,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={p.color}/></mesh><Box p={[0,.20,.20]} s={[.34,.04,.30]} color={p.trim}/></group>;
}
export function OutfitExtras({top,bag,hat}:{top?:Product;bag?:Product;hat?:Product}){
  return <group>
    {top?.shape==='jacket'&&<group>{[-1,1].map(sign=><group key={sign} position={[sign*.085,1.44,.21]} rotation={[0,0,sign*.34]}><Box p={[0,0,0]} s={[.10,.27,.045]} color={top.trim}/></group>)}{[1.15,1.27,1.39].map(h=><mesh key={h} position={[0,h,.257]}><sphereGeometry args={[.021,8,6]}/><meshStandardMaterial color={top.trim} metalness={.7}/></mesh>)}</group>}
    {bag&&<><group position={[.33,.72,.03]} scale={.65}><ProductModel product={bag}/></group><mesh position={[.08,1.26,.245]} rotation={[0,0,-.5]}><boxGeometry args={[.037,.80,.025]}/><meshStandardMaterial color={bag.trim}/></mesh></>}
    {hat&&<group position={[0,1.77,0]}><ProductModel product={hat}/></group>}
  </group>;
}
