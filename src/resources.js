// Transient actors own geometry and local tell/line materials; common game materials survive.
export function disposeObject(root,sharedMaterials) {
  root.removeFromParent();
  const geometries=new Set(),materials=new Set();
  root.traverse(o=>{
    if(o.isInstancedMesh)o.dispose();
    if(o.geometry&&!o.isSprite)geometries.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])
      if(!sharedMaterials.has(m))materials.add(m);
  });
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
}
