"use strict";

export const SIG_TYPE_ERROR=0;
export const SIG_TYPE_ID = 1;
export const SIG_TYPE_NEW_PEER_REQ=4;
export const SIG_TYPE_PEER_REFUSE_THE_REQ=5;
const SIG_TYPE_MANUAL_CLOSE=6;
const SIG_TYPE_DESCRIPTION=2;
const SIG_TYPE_CANDIDATE=3;

export class MySignalingServer {
	/**
	 * @param {WebSocket} ws 
	 * @param {RTCConfiguration?} configuration
	 */
	constructor(ws, configuration){
		this.id="";
		this.rtcConfig=configuration;
		/**@type {Map<string,MyRTCPeerConn>} */
		this.peers=new Map();
		this.ws = ws;
		
		this.ws.addEventListener("message", (ev)=>this._onmessage(JSON.parse(ev.data)));
	}
	/**
	 * @param {MyRTCPeerConn} peer 
	 * @param {RTCIceCandidate} candidate 
	 */
	_sendICECandidate(peer, candidate){
		const msg = {
			type: SIG_TYPE_CANDIDATE, 
			from: this.id, 
			to: peer.targetid, 
			data: candidate
		};
		this.ws.send(JSON.stringify(msg));
		console.log(`sending Candidate: ${this.id}=>${peer.targetid}, candidate: `,candidate);
	}
	/**
	 * @param {MyRTCPeerConn} peer 
	 * @param {RTCSessionDescription} description 
	 */
	_sendDescription(peer, description){
		const msg = {
			type: SIG_TYPE_DESCRIPTION, 
			from: this.id, 
			to: peer.targetid, 
			data: description
		};
		this.ws.send(JSON.stringify(msg));
		console.log(`sending Description: ${this.id}=>${peer.targetid}, description: `, description);
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	async _onmessage(msg){
		// console.log(msg);
		switch (msg.type) {
			case SIG_TYPE_ID:					
				this.id=msg.data;
				console.log(`signaling server get id: ${this.id}`);
				break;
			case SIG_TYPE_ERROR:
				this._handleErrorMsg(msg);
				break;
			case SIG_TYPE_CANDIDATE:
				await this._handleCandidateMsg(msg);
				break;
			case SIG_TYPE_DESCRIPTION:
				await this._handleDescription(msg);
				break;
			case SIG_TYPE_MANUAL_CLOSE:
				this._handlePeerManualClose(msg);
				break;
			default:
				// console.log(`recv unknown msg: `, msg);
				break;
		}
	}
	/**
	 * @param {string} targetid 
	 * @param {string} s
	 */
	_respError(targetid, s){
		const msg={
			type: SIG_TYPE_ERROR,
			from: this.id,
			to: targetid,
			data: s
		};
		this.ws.send(JSON.stringify(msg));
	}
	
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	_handleErrorMsg(msg){
		console.error;(`recv error msg: `, msg);
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	async _handleCandidateMsg(msg){
		const peer = this.peers.get(msg.from);
		if(peer){
			try {
				await peer._recvCandidate(msg.data);
			} catch (err) {
				console.error(`add ice candidate failed:`, err);
			}
		}else{
			this._respError(msg.from,`${msg.from}->${msg.to} candidate has recved, but peer not found!`);
		}
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	async _handleDescription(msg){
		const peer = this.peers.get(msg.from);
		if(peer){
			/**@type {RTCSessionDescription} */
			const desc=msg.data;
			try {
				await peer._recvDescription(desc);
			} catch (err) {
				console.log(`set remote description failed:`, err);
				//彼端关闭了，此端还不知道，然后彼端又发来了邀请。
				if(desc.type==="offer"){
					peer._closeByPeer();
					await this._handleDescription(msg);
				}
			}
		}else{
			msg.type=SIG_TYPE_NEW_PEER_REQ;
			this.ws.dispatchEvent(new MessageEvent("message",{
				data:JSON.stringify(msg)
			}));
		}
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 */
	_handlePeerManualClose(msg){
		const peer = this.peers.get(msg.from);
		if(peer){
			peer._closeByPeer();
		}
	}
	/**
	 * @param {{type: number, from: string, to: string, data: object}} msg
	 * @param {(ev: RTCTrackEvent) => {}} hasStreamTrackCb
	 * @param {(status: string) => {}} connStateCb
	 * @param {(status: "checking" | "closed" | "completed" | "connected" | "disconnected" | "failed" | "new") => {}} iceConnStateCb
	 * @returns {MyRTCPeerConn}
	 */
	async acceptNewPeerReq(msg, hasStreamTrackCb, connStateCb, iceConnStateCb){
		const peer = this.createPeerConn(msg.from, hasStreamTrackCb, connStateCb, iceConnStateCb);
		await this._handleDescription(msg);
		return peer;
	}
	/**
	 * @param {string} targetid 
	 */
	refuseNewPeerReq(targetid){
		const msg={
			type: SIG_TYPE_PEER_REFUSE_THE_REQ,
			from: this.id,
			to: targetid,
			data: "peer refuse the request!"
		};
		this.ws.send(JSON.stringify(msg));
	}
	/**
	 * @param {string} targetid 
	 * @param {(ev: RTCTrackEvent) => {}} hasStreamTrackCb
	 * @param {(status: string) => {}} connStateCb
	 * @param {(status: RTCIceConnectionState) => {}} iceConnStateCb
	 * @param {(status: RTCIceGatheringState) => {}} iceGatheringStateCb
	 * @param {(status: RTCSignalingState) => {}} signalingStateCb
	 * @returns {MyRTCPeerConn} 
	 */
	createPeerConn(targetid, hasStreamTrackCb, connStateCb, iceConnStateCb, iceGatheringStateCb, signalingStateCb){
		let peer = this.peers.get(targetid);
		if (peer)
		return peer;
		peer = new MyRTCPeerConn(targetid, this, this.rtcConfig);
		peer.setHasStreamTrackCallback(hasStreamTrackCb);
		peer.setConnStateCallback(connStateCb);
		peer.setICEConnStateCallback(iceConnStateCb);
		peer.setICEGatheringStateCallback(iceGatheringStateCb);
		peer.setSignalingStateCallback(signalingStateCb);
		this.peers.set(targetid, peer);
		return peer;
	}
	/**
	 * @param {string} targetid 
	 * @returns {boolean}
	 */
	hasPeer(targetid){
		return this.peers.has(targetid);
	}
	/**
	 * @param {string} targetid 
	 * @returns {MyRTCPeerConn}
	 */
	getPeer(targetid){
		return this.peers.get(targetid);
	}
	/**
	 * @param {string} targetid 
	 */
	_notifyPeerManualClose(targetid){
		const msg={
			type: SIG_TYPE_MANUAL_CLOSE,
			from: this.id,
			to: targetid,
			data: ""
		};
		this.ws.send(JSON.stringify(msg));
	}
	/**
	 * @param {string} targetid 
	 */
	_deletePeer(targetid){
		this.peers.delete(targetid);
	}
}
export class MyRTCPeerConn extends RTCPeerConnection{
	/**
	 * @param {string} targetid
	 * @param {MySignalingServer} signalingServer
	 * @param {RTCConfiguration?} configuration
	 */
	constructor(targetid, signalingServer, configuration){
		super(configuration)
		this.targetid=targetid;
		this.signalingServer=signalingServer;
		this.addEventListener("connectionstatechange", this._handleConnectionStateChange);
		this.addEventListener("datachannel", this._handleDataChannel);
		this.addEventListener("icecandidate", this._handleICECandidate);
		this.addEventListener("icecandidateerror", this._handleICECandidateError);
		this.addEventListener("iceconnectionstatechange", this._handleICEConnectionStateChange);
		this.addEventListener("icegatheringstatechange", this._handleICEGatheringStateChange);
		this.addEventListener("negotiationneeded", this._handleNegotiationNeeded);
		this.addEventListener("signalingstatechange", this._handleSignalingStateChange);
		this.addEventListener("track", this._handleTrack);
		/**@type {(status: RTCPeerConnectionState)=>{}} */
		this._connStateCb=null;
		/**@type {(status: RTCIceConnectionState)=>{}} */
		this._iceConnStateCb=null;
		/**@type {(status: RTCIceGatheringState)=>{}} */
		this._iceGatheringStateCb=null;
		/**@type {(status: RTCSignalingState)=>{}} */
		this._signalingStateCb=null;
		/**@type {(ev: RTCTrackEvent)=>{}} */
		this._hasStreamTrackCb=null;
		this._makingOffer=false;
		this._polite=true;
	}
	/**
	 * @param {(status: RTCPeerConnectionState)=>{}} cb 
	 */
	setConnStateCallback(cb){
		this._connStateCb=cb;
	}
	/**
	 * @param {(status: RTCIceConnectionState)=>{}} cb 
	 */
	setICEConnStateCallback(cb){
		this._iceConnStateCb=cb;
	}
	/**
	 * @param {(status: RTCIceGatheringState)=>{}} cb 
	 */
	setICEGatheringStateCallback(cb){
		this._iceGatheringStateCb=cb;
	}
	/**
	 * @param {(status: RTCSignalingState)=>{}} cb 
	 */
	setSignalingStateCallback(cb){
		this._signalingStateCb=cb;
	}
	/**
	 * 
	 * @param {(ev: RTCTrackEvent)=>{}} cb 
	 */
	setHasStreamTrackCallback(cb){
		this._hasStreamTrackCb=cb;
	}
	/**
	 * Sent when the overall connectivity status of the RTCPeerConnection changes.
	 * @param {Event} ev 
	 */
	_handleConnectionStateChange(ev){
		console.log(`connection state: `, this.connectionState);
		if(this.connectionState==="disconnected"){
			this.signalingServer._deletePeer(this.targetid);
		}
		
		if(this._connStateCb)
			this._connStateCb(this.connectionState);
	}
	/**
	 * Sent when the remote peer adds an RTCDataChannel to the connection.
	 * 当远方调用createDataChannel时这个触发这个事件
	 * @param {RTCDataChannelEvent} ev 
	 */
	_handleDataChannel(ev){
		console.log(`onDataChannel: `, ev);
		ev.channel.onopen=(evmsg)=>console.log(`${this.targetid} Data channel is open: `, evmsg);
		ev.channel.onmessage=(evmsg)=>console.log(`${this.targetid} Data channel incoming msg: `, evmsg);
		ev.channel.onclose=(evmsg)=>console.log(`${this.targetid} Data channel is close: `, evmsg);
	}
	/**
	 * 当调用setLocalDescription后，出现新的候选或者候选收集结束，会触发该事件，需要将ICE候选发送给远端，以更新远端的备选源
	 * @param {RTCPeerConnectionIceEvent} ev 
	 */
	_handleICECandidate(ev){
		console.log(`onICECandidate`);
		if(ev.candidate!==null)
			this.signalingServer._sendICECandidate(this, ev.candidate);
	}
	/**
	 * 收集连接候选时发生错误触发
	 * @param {*RTCPeerConnectionIceErrorEvent} ev 
	 */
	_handleICECandidateError(ev){
		console.log(`onICECandidateError: `, ev);
	}
	/**
	 * ICE连接状态改变时触发，"checking" | "closed" | "completed" | "connected" | "disconnected" | "failed" | "new"
	 * @param {Event} ev 
	 */
	_handleICEConnectionStateChange(ev){
		console.log(`ice connection state: ${this.iceConnectionState}`);
		if(this.iceConnectionState==="failed"){
			this.restartIce();
		}
		if(this._iceConnStateCb)
			this._iceConnStateCb(this.iceConnectionState);
	}
	/**
	 * ICE收集状态改变时触发，"complete" | "gathering" | "new"
	 * @param {Event} ev 
	 */
	_handleICEGatheringStateChange(ev){
		console.log(`ice gathering state: ${this.iceGatheringState}`);
		if(this._iceGatheringStateCb)
			this._iceGatheringStateCb(this.iceGatheringState);
	}
	/**
	 * ice连接需要协商时触发，如第一次打开连接或者网络发生变化时
	 * @param {Event} ev 
	 */
	async _handleNegotiationNeeded(ev){
		console.log(`need negotiation: ${this.targetid}`)
		await this.sendDescription();
	}
	/**
	 * 当信令连接状态变化时触发，"closed" | "have-local-offer" | "have-local-pranswer" | "have-remote-offer" | "have-remote-pranswer" | "stable"
	 * @param {Event} ev 
	 */
	_handleSignalingStateChange(ev){
		console.log(`signaling state: ${this.signalingState}`);
		if(this._signalingStateCb)
			this._signalingStateCb(this.signalingState);
	}
	/**
	 * 当MediaStreamTrack被创建或者关联到已被添加到接收集合的RTCRtpReceiver时触发
	 * @param {RTCTrackEvent} ev 
	 */
	_handleTrack(ev){
		console.log("peer add track: ",ev.track, this.targetid );
		if(this._hasStreamTrackCb)
			this._hasStreamTrackCb(ev);
	}
	async sendDescription(){
		try{
			this._makingOffer=true;
			await this.setLocalDescription();
			this.signalingServer._sendDescription(this, this.localDescription);
		}
		catch(err){
			console.error(err);
		}
		finally{
			this._makingOffer=false;
		}
	}
	/**
	 * @param {RTCSessionDescription} description 
	 * @throws {Exception}
	 */
	async _recvDescription(description){
		console.log(`recv ${description.type}: `, description);
		let ignoreOffer=false;
		const offerCollision = (description.type==="offer") && (this._makingOffer || this.signalingState!=="stable");
		ignoreOffer= !this._polite && offerCollision;
		if(ignoreOffer) return;
		await this.setRemoteDescription(description);
		if(description.type==="offer"){
			await this.setLocalDescription();
			this.signalingServer._sendDescription(this, this.localDescription);
			this._polite=true;
		}else{
			this._polite=false;
		}
		
	}
	/**
	 * @param {RTCIceCandidate} candidate 
	 * @throws {Exception}
	 */
	async _recvCandidate(candidate){
		console.log(`recv candidate: `, candidate);
		await this.addIceCandidate(candidate);
			
	}
	_closeByPeer(){
		super.close();
		// 由于主动关闭不会触发任何状态改变的事件，所以手动调用一下；
		if (this._connStateCb){
			this._connStateCb(this.connectionState);
			this._connStateCb=null;
		}
		this.signalingServer._deletePeer(this.targetid);
	}
	close(){
		super.close();
		// 由于主动关闭不会触发任何状态改变的事件，所以手动调用一下；
		if (this._connStateCb){
			this._connStateCb(this.connectionState);
			this._connStateCb=null;
		}
		if(this.signalingServer.hasPeer(this.targetid)){
			this.signalingServer._notifyPeerManualClose(this.targetid);
			this.signalingServer._deletePeer(this.targetid);
		}
	}
}