// Project a real Three.js monitor plane onto a live HTML surface. The matrix
// maps all four corners; this is a perspective surface, not a screenshot.
export function updateCameraView(camera,target) {
  camera.lookAt(target);
  // lookAt changes the quaternion after refreshing the old world matrix.
  // HTML projection must use the same new view that WebGL will render.
  camera.updateMatrixWorld(true);
}

export function fitPlayerToDisplay(displayWidth,displayHeight,{top=0,bottom=0}={}) {
  const availableHeight=displayHeight-top-bottom;
  const width=Math.min(displayWidth,availableHeight*800/490);
  return {width,height:width*490/800,centreY:(bottom-top)/2};
}

// The desktop occupies the complete physical display. Its CSS height follows
// the panel aspect rather than fitting the older 800×490 Music rectangle.
export function displaySurface(displayWidth,displayHeight,{cssWidth=800}={}) {
  return {width:displayWidth,height:displayHeight,centreY:0,cssWidth,cssHeight:cssWidth*displayHeight/displayWidth};
}

export function quadTransform(points, width = 800, height = 490) {
  const source = [[0,0],[width,0],[width,height],[0,height]];
  const rows = [];
  for (let i=0;i<4;i++) {
    const [x,y] = source[i], {x:u,y:v} = points[i];
    rows.push([x,y,1,0,0,0,-u*x,-u*y,u]);
    rows.push([0,0,0,x,y,1,-v*x,-v*y,v]);
  }
  for(let c=0;c<8;c++) {
    let pivot=c;
    for(let r=c+1;r<8;r++) if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c])) pivot=r;
    if(Math.abs(rows[pivot][c])<1e-10) return null;
    [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
    const divisor=rows[c][c];
    for(let j=c;j<9;j++) rows[c][j]/=divisor;
    for(let r=0;r<8;r++) if(r!==c) {
      const factor=rows[r][c];
      for(let j=c;j<9;j++) rows[r][j]-=factor*rows[c][j];
    }
  }
  const [a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);
  return [a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1];
}
