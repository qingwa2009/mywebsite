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

	const ws=App.createWebSocket(window, "multiplayer");
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

	function update(){
		resizeCanvas();
		draw();
		requestAnimationFrame(update);
	}
	
	update();

	function draw(){
// 		ctx.globalCompositeOperation="lighter";
// 		ctx.fillStyle="#FFFFFF01";
// 		ctx.fillRect(0, 0, cv.width, cv.height);
		ctx.clearRect(0, 0, cv.width, cv.height);

		ctx.save();
		ctx.fillStyle="#00ff0010";
		ctx.fillRect(0,0,100,100);
		ctx.fillStyle="#ff00ff10";
		ctx.fillRect(50,50,100,100);
		ctx.clearRect(60,60,30,30);
		ctx.strokeRect(70,70,10,10);

		ctx.fillStyle="#0000ff10";
		ctx.beginPath();
		ctx.moveTo(100,50);
		ctx.lineTo(50,100);
		ctx.lineTo(100,150);
		ctx.lineTo(150,100);
		ctx.closePath();
		ctx.stroke();
		
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(0,100);
		ctx.lineTo(100,100);
		ctx.strokeStyle="#000";
		ctx.lineWidth=1;
		ctx.stroke();
		
		ctx.beginPath();
		for(let i=1; i<11; i++){
			ctx.moveTo(0, i*10);
			ctx.lineTo(100, i*10);
			ctx.moveTo(i*10, 0);
			ctx.lineTo(i*10, 100);
		}
		ctx.strokeStyle="#aaa";
		ctx.lineWidth=0.2;
		ctx.stroke();

		ctx.beginPath();
		for(let j=0; j<1;j++){
			ctx.moveTo(0,50);
			for(let i=0; i<10; i++){
				ctx.lineTo((i+1)*10,Math.floor(Math.random()*100));	
			}
			ctx.strokeStyle="#f005";
			ctx.lineWidth=0.2;
			ctx.stroke();
		}

		ctx.beginPath();
		ctx.moveTo(0,100);
		ctx.lineTo(0,200);
		ctx.lineTo(100,200);
		ctx.strokeStyle="#000";
		ctx.lineWidth=1;
		ctx.stroke();
	
		ctx.beginPath();
		ctx.moveTo(0,200);
		for(let i=0; i<10; i++){	
		 	const step=100/10;			
			let x=i*step;			
			let y=Math.floor(Math.random()*100)+100;			
// 			ctx.fillRect(x,y,5,200-y);
			ctx.lineTo(x, y);
			ctx.lineTo(x+step, y);
		}
		ctx.lineTo(100,200);
		ctx.fillStyle="#ff01";
		ctx.fill();
		ctx.strokeStyle="#00f2";
		ctx.lineWidth=0.5;		
		ctx.stroke();

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

		drawChart(ctx, 200, 200, 150, 100, 5);
		drawPolyline(ctx, 200, 200, 150, 100, [10,50,30,20,100], "red", true);
		drawPolyline(ctx, 200, 200, 150, 100, [0,80,20,50,70], "blue", true);
	}


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
		ctx.closePath();

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
		ctx.lineWidth=0.5
		ctx.stroke();	
		ctx.closePath();
		ctx.restore();	
	}
	
	var dashOffset=0;
	function animDash(){
		dashOffset=(dashOffset-1)%6;
		setTimeout(animDash,20);
	}
	animDash();
	function drawPolyline(ctx, x, y, width, height, ps, lineColor, isDotLine){
		const x1=x+width, y1=y+height;
		let isSingle=false;
		if (ps.length===1){
			isSingle=true;
			ps.push(ps[0]);			
		}
		const count=ps.length;
		const dx=width/(count-1);
		const dy=height/100;
		ctx.beginPath();
		ctx.moveTo(x,y1-ps[0]*dy);
		for (let i=1; i<count; i++){
			let x2=x+i*dx;
			ctx.lineTo(x+dx*i, y1-ps[i]*dy);
		}

		ctx.save();
		ctx.strokeStyle=lineColor;
		ctx.lineWidth=1.0;
		if (isDotLine) {
			ctx.setLineDash([2,4]);
			ctx.lineDashOffset=dashOffset;
		}
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
		
		if (isSingle) {
			ps.pop();
		}
	}

}
);
