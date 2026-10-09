import type { Box3 } from 'three';

/** Conservative XZ broad phase; exact Y/body/ray tests remain with the caller. */
export class SpatialBoxIndex {
  private cells = new Map<number, Map<number, Box3[]>>();
  private large: Box3[] = [];
  private seen = new Set<Box3>();
  constructor(boxes: readonly Box3[], private cellSize = 24) {
    for (const box of boxes) {
      const x0=Math.floor(box.min.x/cellSize), x1=Math.floor(box.max.x/cellSize);
      const z0=Math.floor(box.min.z/cellSize), z1=Math.floor(box.max.z/cellSize);
      if ((x1-x0+1)*(z1-z0+1)>128) { this.large.push(box); continue; }
      for(let x=x0;x<=x1;x++) {
        let column=this.cells.get(x);
        if(!column) this.cells.set(x,column=new Map());
        for(let z=z0;z<=z1;z++) {
          let cell=column.get(z);
          if(!cell) column.set(z,cell=[]);
          cell.push(box);
        }
      }
    }
  }
  query(minX:number,minZ:number,maxX:number,maxZ:number,out:Box3[]) {
    out.length=0; this.seen.clear();
    const add=(box:Box3)=>{
      if(this.seen.has(box)||box.max.x<minX||box.min.x>maxX||box.max.z<minZ||box.min.z>maxZ)return;
      this.seen.add(box);out.push(box);
    };
    for(const box of this.large)add(box);
    for(let x=Math.floor(minX/this.cellSize);x<=Math.floor(maxX/this.cellSize);x++){
      const column=this.cells.get(x);if(!column)continue;
      for(let z=Math.floor(minZ/this.cellSize);z<=Math.floor(maxZ/this.cellSize);z++){
        const cell=column.get(z);if(cell)for(const box of cell)add(box);
      }
    }
    return out;
  }
}
