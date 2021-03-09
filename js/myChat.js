"use strict";
window.addEventListener('DOMContentLoaded', ()=>{
	const App = top.window.App;
	const CommonFunc=top.window.CommonFunc;
	const myMenu = App.myMenu;
	const origin = top.location.origin;	//http://127.0.0.1
	const host = top.location.host;		//127.0.0.1

	const CLASS_PLAYER="player";
	const CLASS_SELF="self";

	const P_ID = "id";
	const P_ACT = "act";
	const P_DRAW="draw";
	const P_X = "x";
	const P_Y = "y";
	const P_SELF = "self";

	const ACT_ADD = "add";
	const ACT_DEL = "del";
	const ACT_MOV = "mov";

	const players={};
	var selfID=undefined;

	const ws=App.createWebSocket(window, "/multiplayer", "json");
	ws.onmessage=e=>{handleData(JSON.parse(e.data));};
	ws.onclose=e=>{console.warn(e);};

	function handleData(dt){
		const act=dt[P_ACT];
		switch(act){
			case ACT_MOV:
				if(dt[P_DRAW]){
					createLine(...dt[P_DRAW]);
				}else{
					movePlayer(dt);	
				}				
				break;
			case ACT_ADD:
				createPlayer(dt);
				break;
			case ACT_DEL:
				removePlayer(dt);
				break;
			default:
				console.warn(`Unknown Action: ${act}`);
				break;
		}
	}

	const cv=document.getElementById("cv");
	const ctx=cv.getContext("2d");
	
	
	

	function createPlayer(dt){		
		const id=dt[P_ID];
		players[id]=dt;

		if(dt[P_SELF]){
			cv.addEventListener("mousemove", handleMouseMove, true);
			cv.addEventListener("click", handleMouseClick, true);
			selfID=id;
			delete dt[P_SELF];
		}
	}

	function removePlayer(dt){
		const id=dt[P_ID];
		if(players[id]) delete players[id];	
		console.log(`player: ${id} disconnected!`)	
	}

	function movePlayer(dt){
		const id=dt[P_ID];
		const player=players[id];
		console.assert(player, "move player is not exists!!!");
		players[id]=dt;
// 		const x=dt[P_X];
// 		const y=dt[P_Y];
// 		player.style.cssText=`
// 			left:${x-0.5*player.clientWidth}px; 
// 			top:${y-0.5*player.clientHeight}px
// 		`;
	}

	function handleMouseMove(e){
		const x=e.clientX;
		const y=e.clientY;
		
		const dt=players[selfID];				
		dt[P_ACT]=ACT_MOV;
		dt[P_X]=x;
		dt[P_Y]=y;
		ws.send(JSON.stringify(dt));
	}
	
	let clickPoints=[];
	function handleMouseClick(e){
		const x=e.clientX;
		const y=e.clientY;

		clickPoints.push([x,y]);
		if(clickPoints.length===2){
			createLine(...clickPoints);
			sendDraw(clickPoints);
			clickPoints=[];
		}
	}

	function createLine(p0, p1){
		drawEms.push([p0, p1]);
	}

	function sendDraw(d){
		const dt={};		
		dt[P_ID]=selfID;
		dt[P_ACT]=ACT_MOV;
		dt[P_DRAW]=d;	
		ws.send(JSON.stringify(dt));
	}

	const drawEms=[];
	function handleDraw(){
		ctx.save();
		ctx.strokeStyle="#000";
		for(let i=0; i<drawEms.length; i++){
			ctx.beginPath();
			ctx.moveTo(...drawEms[i][0]);
			ctx.lineTo(...drawEms[i][1]);	
			ctx.stroke();		
		}	
		ctx.restore();	
	}

	function resizeCanvas(){
		if (cv.width===cv.clientWidth && cv.height===cv.clientHeight) return;
		cv.width=cv.clientWidth;
		cv.height=cv.clientHeight;
	}

	

	const ps=new Array(3);
	var dashOffset=0;
	var textDashOffset=0;
	function draw(){
// 		ctx.globalCompositeOperation="lighter";
// 		ctx.fillStyle="#FFFFFF01";
// 		ctx.fillRect(0, 0, cv.width, cv.height);
		ctx.clearRect(0, 0, cv.width, cv.height);

		ctx.save();
		

// 		ctx.globalCompositeOperation="source-over";
		for(let k in players){
			let player=players[k];
			let x=player[P_X]||0;
			let y=player[P_Y]||0;
			ctx.beginPath();
			ctx.arc(x,y,10,0,Math.PI*2,true);
			ctx.fillStyle=selfID==k ? "#00aaff" : "#ff0000";	
			ctx.fill();
		}
		ctx.restore();

		handleDraw();

		ctx.save()
		ctx.font="100px sans-serif"
		ctx.strokeStyle="black";
		ctx.setLineDash([30,250]);
		textDashOffset=(textDashOffset+5)%280;
		ctx.lineDashOffset=textDashOffset;
		ctx.strokeText("ABC", 250, 200);		
		ctx.restore();

		drawChart(ctx, 200, 200, 150, 100, 5);
		ctx.save();
		ctx.lineWidth=1.0
		ctx.setLineDash([2,4]);
		ctx.lineDashOffset=0;
		ps[0] = ps[0] || createPolyline(ctx, 200, 200, 150, 100, [10,50,30,20,100]);						
		ctx.strokeStyle="red";
		ctx.stroke(ps[0]);		
		ps[1] = ps[1] || createPolyline(ctx, 200, 200, 150, 100, [50,20,10,8,10]);
		ctx.strokeStyle="purple";
		ctx.stroke(ps[1]);		
		ps[2] = ps[2] || createPolyline(ctx, 200, 200, 150, 100, [0,80,20,50,70]);
		ctx.setLineDash([]);
		ctx.lineWidth=2;
		ctx.shadowColor="gray";
		ctx.shadowOffsetY=2;
		ctx.shadowBlur=3;
		ctx.strokeStyle="blue";
		ctx.stroke(ps[2]);
		ctx.setLineDash([4,2]);
		dashOffset=(dashOffset-1)%6;
		ctx.lineDashOffset=dashOffset;
		ctx.strokeStyle="white";
		ctx.lineWidth=.5;
		ctx.shadowColor="white";
		ctx.stroke(ps[2]);		
		ctx.restore();


		drawChart2(ctx, 20, 200, 150, 100, 5);
		drawHistogram(ctx, 20, 200, 150, 100, {5:5,12:8,26:7,29:50,60:80,80:6,90:1}, 72, 10, "#aabbcc99");
	}

	function update(){
		resizeCanvas();
		draw();
		requestAnimationFrame(update);
	}

	update();

	const boxes=[
		document.getElementById("box0"),
		document.getElementById("box1"),
		document.getElementById("box2")
	];

	for(let i=0; i<boxes.length; i++){
		boxes[i].addEventListener("click",boxClick,true);
		boxes[i].addEventListener("animationend",animEnd,true);
		boxes[i].style.order=i;
	}

	let clicked=[];
	let swapping=false;
	function boxClick(e){
		if (swapping) return;
		const target=e.currentTarget; 		
 		if (clicked.includes(target)) return;
 		clicked.push(target);
		target.firstChild.attributes.setNamedItem(document.createAttribute("clicked"));
 		if (clicked.length===2){				 			
			playSwapAnim(...clicked);
 		}
	}

	function swapBox(b0, b1){
		[b0.style.order,b1.style.order]=[b1.style.order,b0.style.order];
	}

	function playSwapAnim(b0, b1){
		swapping=true; 		
		const t=Math.max(Math.random(),0.1).toFixed(2)+"s";//".15s";
		const u_d0=Math.random()>0.5 ? "down" : "up";
		const u_d1=u_d0==="down" ? "up" : "down";
		const b0c=b0.firstChild;
		const b1c=b1.firstChild;

		
		const d0=Number.parseInt(b0.style.order);
		const d1=Number.parseInt(b1.style.order)
		const d=d0-d1;
		const l_r0=d<0 ? "right" : "left";
		const l_r1=l_r0==="right" ? "left" : "right";
		if(Math.abs(d)===2){
			b0.style.animation = `${l_r0}2 ${t}`;
			b1.style.animation = `${l_r1}2 ${t}`;

			b0c.style.animation = b0c.style.animation.includes(u_d0+"20") ? `${u_d0}21 ${t}` : `${u_d0}20 ${t}`;
			b1c.style.animation = b1c.style.animation.includes(u_d1+"20") ? `${u_d1}21 ${t}` : `${u_d1}20 ${t}`;
		}else{			
			b0.style.animation = b0.style.animation.includes(l_r0+"0") ? `${l_r0}1 ${t}` : `${l_r0}0 ${t}`;
			b1.style.animation = b1.style.animation.includes(l_r1+"0") ? `${l_r1}1 ${t}` : `${l_r1}0 ${t}`;					

			b0c.style.animation = b0c.style.animation.includes(u_d0+"0") ? `${u_d0}1 ${t}` : `${u_d0}0 ${t}`;
			b1c.style.animation = b1c.style.animation.includes(u_d1+"0") ? `${u_d1}1 ${t}` : `${u_d1}0 ${t}`;
		}
	}
	
	let animcount=0;
	function animEnd(e){
		animcount++;
		if (animcount<4) return;
		animcount=0;
		if(!swapping)return;
		swapping=false;
		clicked[0].firstChild.attributes.removeNamedItem("clicked");
		clicked[1].firstChild.attributes.removeNamedItem("clicked");
		
		swapBox(...clicked);
		clicked=[];		

// 		playSwapAnim(clicked[0], clicked[1]);
// 		randomSwap();
	}

	function randomSwap(){
		const arr=[0,1,2];
		let i = Math.floor(Math.random()*3);
		const b0=boxes[arr.splice(i,1)[0]];
		i = Math.floor(Math.random()*2);
		const b1=boxes[arr.splice(i,1)[0]];
		clicked=[b0,b1];		
		playSwapAnim(b0, b1);
	}

	//曲线图------------------------------------
	function drawChart(ctx, x, y, width, height, count){
		const x1=x+width, y1=y+height;
		const dy=height/count;
		ctx.save();
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x, y1);
		ctx.lineTo(x1, y1);
		
		ctx.strokeStyle="#000";
		ctx.lineWidth=1;
		ctx.stroke();

		ctx.textAlign="right";		
		const dn=100/count;
		ctx.beginPath();
		for (let i=0; i<=count; i++){
			let y2=y+i*dy;
			ctx.fillText(100-i*dn, x-3, y+i*dy);	
			ctx.moveTo(x, y2);
			ctx.lineTo(x1, y2);
		}
		ctx.strokeStyle="#999";
		ctx.lineWidth=0.4;
		ctx.stroke();	
		ctx.restore();	
	}
	
	
	function createPolyline(ctx, x, y, width, height, ps){
		const x1=x+width, y1=y+height;
		let isSingle=false;
		if (ps.length===1){
			isSingle=true;
			ps.push(ps[0]);			
		}
		const count=ps.length;
		const dx=width/(count-1);
		const dy=height/100;

		const p=new Path2D();

		p.moveTo(x,y1-ps[0]*dy);
		for (let i=1; i<count; i++){
			let x2=x+i*dx;
			p.lineTo(x+dx*i, y1-ps[i]*dy);
		}
		if (isSingle) {
			ps.pop();
		}
		return p;

	}

	//直方图------------------------------------
	function drawChart2(ctx, x, y, width, height, count){
		const x1=x+width, y1=y+height;
		const dx=width/count;
		ctx.save();
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x, y1);
		ctx.lineTo(x1, y1);
		
		ctx.strokeStyle="#000";
		ctx.lineWidth=1;
		ctx.stroke();
		
		ctx.textAlign="center";		
		const dn=100/count;
		ctx.beginPath();
		for (let i=0; i<=count; i++){
			let x2=x+i*dx;
			ctx.fillText(i*dn, x2, y1+15);
			ctx.moveTo(x2, y1);
			ctx.lineTo(x2, y1-5);
		}
		ctx.strokeStyle="#000";
		ctx.lineWidth=0.4;
		ctx.stroke();	
		ctx.restore();	
	}
	
	function drawHistogram(ctx, x, y, width, height, ps, target, count, color){
		const x1=x+width, y1=y+height;
		const dx=width/count;
		const dn=100/count;
		let maxY=0;
		for(let k in ps){
			if(ps[k]>maxY)maxY=ps[k];
		}
		const dy=(height-10)/maxY;

		ctx.save()
		ctx.beginPath();

		let targetY=y1;
		let x2=x, y2=y1;
		ctx.moveTo(x2, y2);
		for(let i=0; i<count; i++){
			let dc=0;
			let n0=dn*i;
			if (n0===0) n0=-1;			
			let n1=dn*(i+1);
			for(let k in ps){
				if(k>n0 && k<=n1){
					dc+=ps[k];
				}				
			}

			y2=y1-dc*dy;
			if(target>n0 && target<=n1){
				targetY=y2;
			}
			ctx.lineTo(x2, y2);
			x2+=dx;
			ctx.lineTo(x2, y2);			
		}
		ctx.lineTo(x1, y1);		
		ctx.closePath();
		ctx.fillStyle=color;
		ctx.fill();		

		ctx.lineWidth=1.0;	
		ctx.strokeStyle="#456";
		ctx.stroke();

		ctx.beginPath();
		x2=x+width/100*target;
		ctx.moveTo(x2, targetY);
		ctx.lineTo(x2, targetY-5);		
		ctx.strokeStyle="green";
// 		ctx.lineWidth=1.0;	
		ctx.stroke();

		ctx.fillStyle=ctx.strokeStyle;
		ctx.textAlign="left";
		ctx.fillText(target, x2, targetY-5);
		
		ctx.restore();
	}

	
	const letters=["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
	const lts={"lt0":undefined, "lt1":undefined, "lt2":undefined, "lt3":undefined, "lt4":undefined, "lt5":undefined, "lt6":undefined}
	for(let k in lts){
		lts[k]=document.getElementById(k);
		lts[k].addEventListener("animationend", letterAnimEnd);		
	}
	
	var ilt=0;
	var ianim=1;
	var lt=lts[`lt${ilt}`];	
	lt.style.animation=`mov${ianim} 0.1s linear both`;	
	function letterAnimEnd(e){	
		if (ilt===6 && ianim===6) {
			lt.style.color="transparent";
			return;
		}			
		
		var t;	
		do{
			t=letters[Math.floor((Math.random()*letters.length))];
		}while(lt.textContent===t);

		if(ianim===7 || ianim===0){
			lt.style.color="transparent";
			ilt++;
			lt=lts[`lt${ilt}`];			
		}		
		let isPositive=ilt%2===0;
		ianim=isPositive ? ianim+1 : ianim-1;
		let reverse=isPositive ? "" : "reverse";
		console.log(ilt,ianim,t);
		lt.textContent=t;				
		lt.style.animation=`mov${ianim} 0.1s linear ${reverse} both`;
		lt.style.color="";
	}



	/*--------------------------offset-path--------------------*/
	const plane=document.getElementById("plane");
	plane.addEventListener("animationiteration",e=>{
		console.log(e);
	},true);
}
);
