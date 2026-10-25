export const broadcastStyleDefaults={identityScale:1,logoScale:1,logoOpacity:.58,safeX:32,safeY:24,lowerMargin:22,awardScale:1,awardOpacity:.84,consultationStyle:'lower',identity:true};
export function broadcastStyle(production={}){return {...broadcastStyleDefaults,...production};}
export function awardGeometry(row,p={}){const s=broadcastStyle(p),team=!!row?.members?.length,h=(team?124:98)*s.awardScale;return {x:s.safeX,y:720-s.lowerMargin-h,w:Math.min(1120,1280-s.safeX*2),h,scale:s.awardScale};}
// Both live and interstitial scenes use this compact, consistent TV identity.
export function drawIdentity(c,d,{text,box,panel,ink,muted,logo,opacity}){
 const p=broadcastStyle(d.production);if(!p.identity)return;
 const x=p.safeX,y=p.safeY,k=p.identityScale;
 c.save();c.translate(x,y);c.scale(k,k);
 box(0,0,284,59,panel(Math.min(.78,opacity)));box(0,0,3,59,'#bc002a');
 text('SDM26',12,29,27,ink,850,180);text('TATAMI '+d.tatami,188,27,12,muted,750,87);
 text('Süddeutsche Meisterschaft des DJKB',12,48,12,ink,650,260);
 c.restore();
 if(logo){const width=190*p.logoScale,height=width*(logo.naturalHeight||303.5)/(logo.naturalWidth||1302.5);c.save();c.globalAlpha=p.logoOpacity;c.drawImage(logo,1280-p.safeX-width,p.safeY,width,height);c.restore();}
}
