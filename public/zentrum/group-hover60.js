// Native details remain operable by touch and keyboard. Mouse previews are transient;
// clicking a preview pins it open until the user closes it again.
const hover=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
document.addEventListener('pointerover',e=>{const tile=e.target.closest?.('.public-group-tile');if(!tile||!hover()||tile.open)return;tile.dataset.hoverOpen='1';tile.open=true;});
document.addEventListener('pointerout',e=>{const tile=e.target.closest?.('.public-group-tile');if(!tile?.dataset.hoverOpen||tile.contains(e.relatedTarget))return;delete tile.dataset.hoverOpen;tile.open=false;});
document.addEventListener('click',e=>{const tile=e.target.closest?.('.public-group-tile>summary')?.parentElement;if(!tile?.dataset.hoverOpen)return;delete tile.dataset.hoverOpen;tile.open=false;},true);
document.addEventListener('keydown',e=>{const tile=e.target.closest?.('.public-group-tile');if(e.key==='Escape'&&tile?.open){delete tile.dataset.hoverOpen;tile.open=false;tile.querySelector('summary').focus();}});
