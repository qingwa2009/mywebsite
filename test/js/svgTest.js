"use strict";
window.addEventListener('DOMContentLoaded', ()=>{
    const el=document.getElementById("el");
    const er=document.getElementById("er");
    let b=el.getBoundingClientRect();
    const elx=b.left+b.width*0.5, ely=b.top+b.height*0.5;
    b=er.getBoundingClientRect();
    const erx=b.left+b.width*0.5, ery=b.top+b.height*0.5;
	document.onmousemove=function(e){
	    const x0=e.clientX, y0=e.clientY;
        let dlx=x0-elx;
        let dly=y0-ely;
        let drx=x0-erx;
        let dry=y0-ery;
        
        let d=Math.sqrt(dlx*dlx+dly*dly);
        dlx/=d;
        dly/=d;
        d=Math.sqrt(drx*drx+dry*dry);
        drx/=d;
        dry/=d;

        el.style.transform=`scale(0.5) translate(${dlx*10}em, ${dly*10}em)`;
        er.style.transform=`scale(0.5) translate(${drx*10}em, ${dry*10}em)`;
	}

}
);
