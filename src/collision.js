// Shared cover definitions drive both visible brick placement and projectile blocking.
export function coverBricks(o) {
  const columns=Math.ceil(o.w/1.1), rows=3, bricks=[];
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    bricks.push({x:o.x-o.w/2+(col+.5)*o.w/columns,
      y:(row+.5)*o.h/rows, z:o.z,
      w:o.w/columns-.025,h:o.h/rows-.025,d:o.d});
  }
  return bricks;
}

// Segment/AABB slab test: blocks even when a fast projectile crosses a corner in one frame.
export function segmentHitsCover(from,to,covers,radius=0) {
  return covers.some(o=>{
    let enter=0,exit=1;
    for(const [axis,half] of [['x',o.w/2+radius],['z',o.d/2+radius]]) {
      const delta=to[axis]-from[axis],low=o[axis]-half,high=o[axis]+half;
      if(Math.abs(delta)<1e-9) {if(from[axis]<low||from[axis]>high)return false;}
      else {
        const a=(low-from[axis])/delta,b=(high-from[axis])/delta;
        enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
        if(enter>exit)return false;
      }
    }
    return true;
  });
}
