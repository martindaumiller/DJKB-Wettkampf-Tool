// The archive never uses the program canvas or a replay as its video source.
export function drawCleanFrame(context,canvas,source,blocked=false){
 context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
 if(blocked||source.readyState<2||!source.videoWidth||!source.videoHeight)return;
 const scale=Math.min(canvas.width/source.videoWidth,canvas.height/source.videoHeight),w=source.videoWidth*scale,h=source.videoHeight*scale;
 context.drawImage(source,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
}
