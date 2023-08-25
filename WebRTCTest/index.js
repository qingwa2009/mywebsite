"use strict";
import { createWebSocket, defineProperty, isParentAndChild } from '../js/myUtil.js';
// import MyMemu from "./components/myMenu/myMenu.js";

class MyRTCPeerConnection extends RTCPeerConnection{
	targetid=""	
}

window.addEventListener('DOMContentLoaded', async () => {
	// const App = top.window.App;
	// /**@type{MyMemu} */
	// const myMenu = App.myMenu;
	// const origin = top.location.origin;				// http://127.0.0.1
	// const host = top.location.host;					// 127.0.0.1
	// const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1
	const wsurl = "/webrtcSignalingServer";
	const TYPES_MYID='myid';
	const TYPES_USERLIST='userlist';
	const TYPES_ERROR='error';
	const TYPES_ICECANDIDATE="icecandidate";
	const TYPES_OFFER="offer";
	const TYPES_ANSWER="answer";
	const TYPES_HANGUP="hangup";

	/**@type{WebSocket} */
	let ws=null;
	let myid="";
	/**@type{Map<string, MyRTCPeerConnection>} */
	let peers=new Map();
	/**@type{MediaStream} */
	let stream=null;
	
	/**
	 * RTCPeerConnection.addTrack(track, ...streams), 
	 * peer只是发送track，不发送stream 。
	 * 这里有个stream的目的是指示对端自动把track加到相同的stream里，
	 * 对于多个stream，就是指示对端相应的stream，把收到
	 * 的track自动加进去。
	 * stream甚至可以为null，对端收到track可以自己看着办	 
	 */
	

	/**@type{HTMLVideoElement}*/
	const emVideo=document.getElementById("v0");
	/**@type{MyRTCPeerConnection}*/
	let emVideoPeer = null;
	/**@type{HTMLOListElement} */
	const emLs = document.getElementById("list");
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
		ws.onopen = e=>{
			console.log("ws open: ",e);
			console.log("ws getting id...");
			ws.send(JSON.stringify({type:TYPES_MYID, data:"lala"+Math.random()}));
		}
		ws.onclose = e => {
			console.log("ws close: ",e);
		}
		ws.onmessage =async e => {
			// console.log(e);
			/**@type {{type: string, id: string, target: string, data: object}} */
			const msg=JSON.parse(e.data);
			console.log(msg);
			switch (msg.type) {
				case TYPES_MYID:					
					handleWSMyID(msg.id);
					break;
				case TYPES_USERLIST:
					handleWSUserList(msg.data);
					break;
				case TYPES_ERROR:
					handleWSError(msg.id, msg.data);
					break;
				case TYPES_ICECANDIDATE:
					await handleWSICECandidate(msg.id, msg.data);
					break;
				case TYPES_OFFER:
					await handleWSOffer(msg.id, msg.data);					
					break;
				case TYPES_ANSWER:
					await handleWSAnswer(msg.id, msg.data);		
					break;
				case TYPES_HANGUP:
					handleWSHangup(msg.id);
					break;
				default:
					console.log("unknown ws msg: ", msg, "from", msg.id);
					break;
			}
		}
		
	}

	

	/**@param{string} id */
	function handleWSMyID(id){
		myid=id;
		console.log("myid: ",myid);
	}

	/**@param{{id:string, name:string}[]} ls */
	function handleWSUserList(ls){
		console.log("userList: ",ls);
		emLs.innerHTML = "";
		ls.forEach(({id,name})=>{
			if(id===myid)return;
			const em = document.createElement("button");	
			em.textContent=id;				
			em.onclick=ev=>invite(id);
			emLs.appendChild(em);			
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
	 * Sent when the overall connectivity status of the RTCPeerConnection changes.
	 * @this {MyRTCPeerConnection} 
	 * @param {Event} ev 
	 */
	function handlePeerConnectionChange(ev){
		switch (this.connectionState) {
			case "new":
			case "connecting":
				console.log("peer connecting...", this.targetid);	
				break;
			case "connected":
				console.log("peer online", this.targetid);
				break;
			case "disconnected":
				this.close();
				peers.delete(this.targetid);
				console.log("peer disconnected", this.targetid);
				break;
			case "closed":
				console.log("peer offline", this.targetid);
				break;
			case "failed":
				console.log("peer error", this.targetid);
				break;
			default:
				console.log("peer unknown", this.targetid);
				break;
		}
	}
	/**
	 * Sent when the remote peer adds an RTCDataChannel to the connection.
	 * @this {MyRTCPeerConnection} 
	 * @param {RTCDataChannelEvent} ev 
	 */
	function handlePeerDataChannel(ev){
		const recvchannel = ev.channel;
		recvchannel.onmessage=evmsg=>console.log("recvchannel msg: ", evmsg, this.targetid);
		recvchannel.onopen=evmsg=>console.log("recvchannel open: ", evmsg, this.targetid);
		recvchannel.onclose=evmsg=>console.log("recvchannel close: ", evmsg, this.targetid);
	}
	/**
	 * Sent to request that the specified candidate be transmitted to the remote peer.
	 * @this {MyRTCPeerConnection} 
	 * @param {RTCPeerConnectionIceEvent} ev 
	 */
	function handlePeerICECandidate(ev){
		if(ev.candidate!==null){
			ws.send(JSON.stringify({type:TYPES_ICECANDIDATE, target:this.targetid, data:ev.candidate}));
			console.log("sending ICECandidate to: ", this.targetid);
		}
	}
	/**
	 * recv from remote peer candidate
	 * @param {string} fromid 
	 * @param {RTCIceCandidate} candidate 
	 */
	async function handleWSICECandidate(fromid, candidate){
		await peers.get(fromid).addIceCandidate(candidate);
	}
	/**
	 * Sent when the ICE layer's gathering state reflected by iceGatheringState changes.
	 * @this {MyRTCPeerConnection} 
	 * @param {Event} ev 
	 */
	function handlePeerICEGatheringStateChange(ev){
		console.log("peer ICEGatheringStateChange: ",this.iceGatheringState, this.targetid);
	}
	/**Sent when the state of the ICE connection changes, such as when it disconnects.
	 * @this {MyRTCPeerConnection} 
	 * @param {Event} ev 
	 */
	function handlePeerICEConnectionStateChange(ev){
		console.log("peer ICEConnectionStateChange: ",this.iceConnectionState, this.targetid);
	}
	/**
	 * Sent to the connection if an error occurred during ICE candidate gathering.
	 * @this {MyRTCPeerConnection} 
	 * @param {RTCPeerConnectionIceErrorEvent} ev 
	 */
	function handlePeerICECandidateError(ev){
		console.error("peer ICECandidateError: ",ev.url, ev.errorText, this.targetid);
	}
	/**
	 * Sent when negotiation or renegotiation of the ICE connection needs to be performed.
	 * @this {MyRTCPeerConnection} 
	 * @param {Event} ev 
	 */
	async function handlePeerNegotiationNeeded(ev){
		console.log("peer NegotiationNeeded", this.targetid);
		await sendOffer(this, this.targetid);		
	}
	/**
	 * Sent when the connection's ICE signaling state changes
	 * @this {MyRTCPeerConnection} 
	 * @param {Event} ev 
	 */
	function handlePeerSignalingStateChange(ev){
		console.log("peer SignalingStateChange: ",this.signalingState, this.targetid);		 
	}
	/**
	 * Sent after a new track has been added to one of the RTCRtpReceiver.
	 * @this {MyRTCPeerConnection} 
	 * @param {RTCTrackEvent} ev 
	 */
	function handlePeerTrack(ev){
		// ev.track;
		console.log("peer add track: ",ev.track, this.targetid );
		if(ev.streams && ev.streams[0]){
			emVideo.srcObject=ev.streams[0];
			emVideoPeer = this;
			//enable the hang up button
			//...
		}
	}
	
	/**
	 * 获取或者创建peerconnection
	 * @param {string} targetid 
	 * @returns 
	 */
	function getPeerConnection(targetid){
		if (peers.has(targetid)){
			return peers.get(targetid);
		}
		const p=new MyRTCPeerConnection();
		p.targetid=targetid;
		p.onconnectionstatechange=handlePeerConnectionChange;
		p.ondatachannel=handlePeerDataChannel;
		p.onicecandidate=handlePeerICECandidate;
		p.onicegatheringstatechange=handlePeerICEGatheringStateChange;
		p.oniceconnectionstatechange=handlePeerICEConnectionStateChange;
		p.onicecandidateerror=handlePeerICECandidateError;
		p.onnegotiationneeded=handlePeerNegotiationNeeded;
		p.onsignalingstatechange=handlePeerSignalingStateChange;
		p.ontrack=handlePeerTrack;		
		
		peers.set(targetid,p);
		return p;
	}
	
	/**
	 * @param {string} target 
	 * @param {string} errstr 
	 */
	function respErr(target, errstr){
		ws.send(JSON.stringify({type:TYPES_ERROR, target:target, data: errstr}));
	}

	
	//#region==============Negotiation State 协商阶段================
	/**
	 * @param {MyRTCPeerConnection} p 
	 * @param {string} targetid 
	 */
	async function sendOffer(p, targetid){
		const optOffer={offerToReceiveAudio: true, offerToReceiveVideo: true};
		const offer = await p.createOffer(optOffer);
		await p.setLocalDescription(offer);
		ws.send(JSON.stringify({type:TYPES_OFFER, target: targetid, data: offer}));
		console.log("sending offer to: ", targetid);
	}
	/**
	 * 发offer
	 * @param{string} id
	 */	
	async function invite(id){
		if(id===myid){
			alert("不能邀请自己！");
			return;
		}		
		if(emVideoPeer){
			if(stream){
				stream.getTracks().forEach(track=>track.stop());					
			}
			sendHangup(emVideoPeer);
			releasePeer(emVideoPeer);
			peers.delete(emVideoPeer.targetid);	
			emVideoPeer=null;
		}
		console.log("inviting ",id);
		const p = getPeerConnection(id);
		await sendOffer(p, id);
	}
	/**
	 * 收offer
	 * @param{string} fromId
	 * @param{RTCSessionDescriptionInit} offer
	*/
	async function handleWSOffer(fromId, offer){
		console.log("recv offer from: ", fromId);
		const p = getPeerConnection(fromId);
		await p.setRemoteDescription(offer);
		prepareStreamForPeer(p);
		await sendAnswer(p);		
	}
	/**
	 * 发answer
	 * @param {MyRTCPeerConnection} p 
	 */
	async function sendAnswer(p){
		const answer = await p.createAnswer();
		await p.setLocalDescription(answer);
		ws.send(JSON.stringify({type:TYPES_ANSWER, target: p.targetid, data:answer}));			
		console.log("sending answer to: ", p.targetid);	
	}
	/**
	 * 收answer
	 * @param{string} fromId
	 * @param{RTCSessionDescriptionInit} offer
	*/
	async function handleWSAnswer(fromId, answer){
		console.log("recv answer from: ", fromId);
		const p = getPeerConnection(fromId);	
		await p.setRemoteDescription(answer);	
	}
	/**
	 * 发送挂断通知
	 * @param {MyRTCPeerConnection} p 
	 */
	function sendHangup(p){
		ws.send(JSON.stringify({type:TYPES_HANGUP, target: p.targetid}));
		console.log(`sending hangup to: `, p.targetid);
	}
	/**
	 * 收到挂断通知
	 * @param {string} fromId 
	 */
	function handleWSHangup(fromId){
		console.log(`peer hangup `, fromId);
		const p = peers.get(fromId);
		peers.delete(fromId);
		releasePeer(p);
	}
	//#endregion=================================================

	/**	 
	 * @param {MyRTCPeerConnection} p
	 */
	function prepareStreamForPeer(p){
		if(!stream || !stream.active){
			alert(`${p.targetid} 想看你的直播！`);
			return;
		}		
		stream.getTracks().forEach(track=>p.addTrack(track, stream));			
	}

	async function openShare(){
		const opt={video: true, audio: true,};
		stream = await navigator.mediaDevices.getDisplayMedia(opt); 
		if(stream){
			stream.getTracks().forEach(track=> {
				track.onended=ev=>{
					console.log(track.kind, "track ended",  ev);
				}
				for (const p of peers.values()) {
					p.addTrack(track, stream);
				}
			});
		}
	}

	function shutdownShare(){
		if(stream){
			stream.getTracks().forEach(track=>track.stop());					
		}
		for (const p of peers.values()) {
			sendHangup(p);
			releasePeer(p);	
		} 
		peers.clear();
		emVideo.srcObject=null;
		emVideoPeer=null;
		stream=null;
		console.log("shutdown share!");
	}
	/**
	 * @param {MyRTCPeerConnection} p 
	 */
	function releasePeer(p){
		// p.getSenders().forEach(sender=>p.removeTrack(sender));
		p.onconnectionstatechange=null;
		p.ondatachannel=null;
		p.onicecandidate=null;
		p.onicecandidateerror=null;
		p.oniceconnectionstatechange=null;
		p.onicegatheringstatechange=null;
		p.onnegotiationneeded=null;
		p.onsignalingstatechange=null;
		p.ontrack=null;
		p.close();		
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
