// The backdrop, camera and coach-feedback paths share the exact same crop.
export function frameFor(host) {
  const {width,height}=host.getBoundingClientRect();
  const zoom=Number(getComputedStyle(host).getPropertyValue('--scene-zoom'))||1;
  const scale=Math.max(width/1672,height/941)*zoom;
  const imageWidth=1672*scale,imageHeight=941*scale;
  return {width,height,zoom,imageWidth,imageHeight,x:(width-imageWidth)/2,y:(height-imageHeight)*(width<=650?.5:.3)};
}
