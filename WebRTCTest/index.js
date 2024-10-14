"use strict";
import { createWebSocket, defineProperty, isParentAndChild } from '../js/myUtil.js';
// import MyMemu from "./components/myMenu/myMenu.js";
import * as mywebrtc from './mywebrtc.js';
import MyTemplates from "../js/myTemplateNode.js";



window.addEventListener('DOMContentLoaded', async () => {
	// const App = top.window.App;
	// /**@type{MyMemu} */
	// const myMenu = App.myMenu;
	// const origin = top.location.origin;				// http://127.0.0.1
	// const host = top.location.host;					// 127.0.0.1
	// const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1
	const wsurl = "/webrtcSignalingServer";
	const TYPES_USERLIST='userlist';
	const TYPES_ERROR='error';

	/**@type{WebSocket} */
	let ws=null;
	let myid="";
	/**@type{Map<string, HTMLElement>} */
	const peerEms=new Map();
	/**@type{MediaStream} */
	let stream=null;
	/**@type{mywebrtc.MySignalingServer} */
	let signalingServer=null;	

	const emPicContainer=document.getElementById("pic_container");
	const mytemplates=new MyTemplates();
	// for (let index = 0; index < 10; index++) {
	// 	let emPic = mytemplates.clone("pic");
	// 	emPicContainer.appendChild(emPic);
	// }

	/**
	 * RTCPeerConnection.addTrack(track, ...streams), 
	 * peer只是发送track，不发送stream 。
	 * 这里有个stream的目的是指示对端自动把track加到相同的stream里，
	 * 对于多个stream，就是指示对端相应的stream，把收到
	 * 的track自动加进去。
	 * stream甚至可以为null，对端收到track可以自己看着办	 
	 */
	
	/**@type{HTMLButtonElement} */
	const btnShare=document.getElementById("btnShare");
	btnShare.addEventListener("click", (ev)=>{
		if(!stream || !stream.active){
			openShare();			
		}else{
			shutdownShare();
		}
	});

	reconnectWebSocket();
	function reconnectWebSocket() {
		ws = createWebSocket(window, wsurl, "json");
		signalingServer=new mywebrtc.MySignalingServer(ws);

		ws.onopen = e=>{
			console.log("ws open: ",e);
		}
		ws.onclose = e => {
			console.log("ws close: ",e);
		}
		ws.onmessage =async e => {
			/**@type {{type: number, from: string, to: string, data: object}}*/
			const msg=JSON.parse(e.data);
			console.log(msg);
			switch (msg.type) {
				case mywebrtc.SIG_TYPE_ID:					
					handleWSMyID(msg.data);
					break;
				case mywebrtc.SIG_TYPE_NEW_PEER_REQ:
					await handleNewPeerReq(msg);
					break;
				case mywebrtc.SIG_TYPE_PEER_REFUSE_THE_REQ:
					alert(`${msg.from} 拒绝了通话！`);
					break;
				case TYPES_USERLIST:
					handleWSUserList(msg.data);
					break;
				case TYPES_ERROR:
					handleWSError(msg.data);
					break;
				default:
					// console.log("unknown ws msg: ", msg);
					break;
			}
		}
	
	}

	/**@param{string} id */
	function handleWSMyID(id){
		myid=id;
		console.log("myid: ",myid);
	}
	/**
	 * @param {MyRTCPeerConn} peer 
	 */
	function updatePeerEmStateText(peer){
		const em=peerEms.get(peer.targetid);
		let txtEm=null;
		txtEm=em.getElementsByClassName("card-text")[1];
		txtEm.textContent=`connection: ${peer.connectionState}`;
		txtEm=em.getElementsByClassName("card-text")[2];
		txtEm.textContent=`signaling: ${peer.signalingState}`;
		txtEm=em.getElementsByClassName("card-text")[3];
		txtEm.textContent=`iceConnection: ${peer.iceConnectionState}`;
		txtEm=em.getElementsByClassName("card-text")[4];
		txtEm.textContent=`iceGathering: ${peer.iceGatheringState}`;
	}
	/**
	 * @param {MouseEvent} ev 
	 */
	async function handlePeerEmClick(ev){
		// console.log(ev.currentTarget, ev.target, ev);
		const id=ev.currentTarget.id;
		if (myid===id){
			return;
		}
		const isClickDisconnect=ev.target===ev.currentTarget.getElementsByTagName("button")[1];
		if(isClickDisconnect){
			if(signalingServer.hasPeer(id)){
				signalingServer.getPeer(id).close();
			}
			return;
		}
		
		// if(!signalingServer.hasPeer(id)){
			const p = signalingServer.createPeerConn(id, hasStreamTrackCallback, connStateCallback, iceConnStateCallback, iceGatheringStateCallback, signalingStateCallback);
			await p.sendDescription();
			pushStream(p);
		// }else{
		// }	
	}

	function addPeerEm(id){
		let em = mytemplates.clone("pic");	
		em.addEventListener("click", handlePeerEmClick, true);
		em.id=id;
		let ct = em.getElementsByClassName("card-text")[0];
		let text = (id===myid) ? `自己：${id}` : `别人：${id}`;
		ct.textContent=text;
		emPicContainer.appendChild(em);
		peerEms.set(id, em);
		return em;
	}
	/**@param{{id:string, name:string}[]} ls */
	function removePeerEmIfNotInLs(ls){
		const pics=emPicContainer.children;
		for (let i = pics.length-1; i >=0 ; i--) {
			const em = pics[i];
			const id = em.id;
			let hasid=false;
			for (const ids of ls) {
				if(ids.id===id){
					hasid=true;
					break;
				}
			}
			if(!hasid){
				peerEms.delete(id);
				em.remove();
			}
		}
	}
	/**@param{{id:string, name:string}[]} ls */
	function handleWSUserList(ls){
		console.log("userList: ",ls);
		removePeerEmIfNotInLs(ls);
		ls.forEach(({id,name})=>{
			if(document.getElementById(id))return;			
			addPeerEm(id);
		})		
	}

	/**
	 * @param {string} fromid 
	 * @param {string} err 
	 */
	function handleWSError(fromid, err){
		console.error(fromid, "ws err: ",err);
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	async function handleNewPeerReq(msg){
		try{
			const notHasStream = !stream || !stream.active;
			if(notHasStream){
				await openShare();
			}
			const peer = await signalingServer.acceptNewPeerReq(msg, hasStreamTrackCallback, connStateCallback, iceConnStateCallback);
			pushStream(peer);
		}catch(err){
			console.log("点了取消", err);
			signalingServer.refuseNewPeerReq(msg.from);
		}
	}

	/**
	 * @param {MyRTCPeerConn?} peer 
	 */
	function pushStream(peer){
		if(stream){
			if(peer){
				stream.getTracks().forEach(track=> {
					if (!track.onended)
						track.onended=ev=>{
							console.log(track.kind, "track ended",  ev);
						}
					peer.addTrack(track, stream);
				});
			}else{
				stream.getTracks().forEach(track=> {
					track.onended=ev=>{
						console.log(track.kind, "track ended",  ev);
					}
					for (const p of signalingServer.peers.values()) {
						p.addTrack(track, stream);
					}
				});
			}
		}
	}
	


	/**
	 * @param {RTCTrackEvent} ev 
	 */
	function hasStreamTrackCallback(ev){
		// console.log("peer add track: ",ev.track, this.targetid );
		const stream=ev.streams[0];
		if(stream){
			const peerEm = peerEms.get(this.targetid);
			const videoEm= peerEm.getElementsByTagName("video")[0];
			videoEm.srcObject=stream;
			//enable the hang up button
			//...
		}
	}
	/**
	 * @param {RTCPeerConnectionState} state 
	 */
	function connStateCallback(state){
		updatePeerEmStateText(this);
	}
	function iceConnStateCallback(state){
		updatePeerEmStateText(this);
	}
	function iceGatheringStateCallback(state){
		updatePeerEmStateText(this);
	}
	function signalingStateCallback(state){
		updatePeerEmStateText(this);
	}
	

	async function openShare(){
		const opt={video: true, audio: true,};
		stream = await navigator.mediaDevices.getDisplayMedia(opt); 
		if(stream){
			pushStream();
			const videoEm = peerEms.get(myid).getElementsByTagName("video")[0];
			videoEm.srcObject=stream;
			btnShare.textContent="取消共享";
		}
	}
	
	function shutdownShare(){
		btnShare.textContent="共享屏幕";
		if(stream){
			stream.getTracks().forEach(track=>track.stop());					
		}
		stream=null;
		console.log("shutdown share!");
	}
	
	/**
	 * 设置视频轨道暂停或者继续
	 * @param {boolean} enable 
	 * @returns 
	 */
	function setVideoState(enable){
		if(!stream || !stream.active)
			return;
		stream.getVideoTracks().forEach(track=>{
			track.enabled=enable;
		});
	}
	/**
	 * 设置音频轨道暂停或者继续
	 * @param {boolean} enable 
	 * @returns 
	 */
	function setAudioState(enable){
		if(!stream || !stream.active)
			return;
		stream.getAudioTracks().forEach(track=>{
			track.enabled=enable;
		});
	}


});
