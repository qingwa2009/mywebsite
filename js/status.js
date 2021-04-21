"use strict";
function loadlisthead(table, title) {
	const headem = table.getElementsByTagName('thead')[0];
	headem.innerText = "";
	const tr = document.createElement('tr');
	for (let i = 0; i < title.length; i++) {
		const th = document.createElement('th');
		th.textContent = title[i];
		tr.appendChild(th);
	}
	headem.appendChild(tr);
}

function loadlistbody(table, data) {
	const bodyem = table.getElementsByTagName('tbody')[0];
	bodyem.innerText = "";
	for (let i = 0; i < data.length; i++) {
		const dt = data[i];
		const tr = document.createElement('tr');
		for (let j = 0; j < dt.length; j++) {
			const td = document.createElement('td');
			td.textContent = dt[j];
			tr.appendChild(td);
		}
		bodyem.appendChild(tr);
	}
}

const $ = document.getElementById.bind(document);
window.addEventListener('DOMContentLoaded', ()=>{
	// 			const App = top.window.App;
	// 			const CommonFunc = top.window.CommonFunc;
	// 			const myMenu = App.myMenu;
	// 			http://127.0.0.1
	const origin = top.location.origin;
	// 			127.0.0.1
	// 			const host = top.location.host;
	const socketcount = $('socketcount');
	const wscount = $('wscount');
	const readingcount = $('readingcount');
	const writingcount = $('writingcount');
	const readinglist = $('readinglist');
	const writinglist = $('writinglist');
	const wslist = $('wslist');
	const loglist = $('loglist');
	const state = $('state');
	const updateWebsite = $('updateWebsite');
	const updateServer = $('updateServer');
	const enablelog=$('enablelog');
	const enablewarn=$('enablewarn');
	const enableerror=$('enableerror');
	const enableweblog=$('enableweblog');
	const content=$('content');
	
	state.onclick=e=>request('/restart', e.currentTarget);
	updateWebsite.onclick=e=>request('/updateWebsite', e.currentTarget);
	updateServer.onclick=e=>request('/updateServer', e.currentTarget);
	function request(url, btn){
		if(!confirm(`确定 '${btn.title}' ?`)) return;
		
		var xhr=new XMLHttpRequest();
		xhr.open('get', url);
		xhr.send();
		btn.disabled=true;
		xhr.onloadend=()=>btn.disabled=false;
		xhr.onload=(ev)=>{
			if(xhr.status!==200)
				alert(`${xhr.status} ${xhr.statusText}\r\n${xhr.responseText}`);
		};
		xhr.onerror=(ev)=>{
			alert("请求错误！无法连接到服务器！");
		};
	}

	function loadStatus(status) {
				console.log(status);
		socketcount.textContent = status.socketCount;
		wscount.textContent = status.webSocket.totalCount;
		readingcount.textContent = status.fileManager.readingCount;
		writingcount.textContent = status.fileManager.writingCount;

		const ws = status.webSocket.ws;
		loadlisthead(wslist, ws.title);
		loadlistbody(wslist, ws.data);

		const reading = status.fileManager.reading;
		loadlisthead(readinglist, reading.title);
		loadlistbody(readinglist, reading.data);

		const writing = status.fileManager.writing;
		loadlisthead(writinglist, writing.title);
		loadlistbody(writinglist, writing.data);

		enablelog.checked=status.debug.log;
		enablewarn.checked=status.debug.warn;
		enableerror.checked=status.debug.error;
		enableweblog.checked=status.debug.weblog;
		
	}

	const ws = new WebSocket(`ws${origin.substr(4)}/status`,'json');

	ws.onmessage = e=>{
		const msg = e.data;
		loadStatus(JSON.parse(msg));
		// 				console.log(msg);				
	}

	ws.onopen = e=>{
		ws.send('');
		state.setAttribute('running', true);
		state.firstChild.textContent = "running";
	}

	ws.onclose = e=>{
		state.setAttribute('running', false);
		state.firstChild.textContent = "stop";
	}

	const wslog = new WebSocket(`ws${origin.substr(4)}/weblog`,'json');
	wslog.onmessage = e=>{
		loadWeblog(e.data);
	}

	
	loadlisthead(loglist, ['time', 'type', 'target', 'content']);
	const logbody=loglist.getElementsByTagName('tbody')[0];
	function loadWeblog(data) {
		const tr=document.createElement('tr');
		const tds=[];
		for(let i=0; i<4; i++){
			const td=document.createElement('td');	
			tr.appendChild(td);
			tds.push(td);
		}
		logbody.appendChild(tr);
		

		let j=0;
		let i=data.indexOf('\t', j);
		tds[0].textContent=data.substring(j, i);

		j=i+1;
		i=data.indexOf('\t', j);
		tds[1].textContent=data.substring(j, i);

		tr.scrollIntoView();
		
		j=i+1;
		i=data.indexOf('\t', j);
		if(i===-1) return;
		let target=data.substring(j, i);
		if(!(/^\d+.\d+.\d+.\d+/.test(target))){
			tds[3].textContent=data.substr(j);	
			return;			
		}
		
		tds[2].textContent=target;					
		j=i+1;
		tds[3].textContent=data.substr(j);		
	}

	enablelog.onchange=ondebugCheckedChange;
	enablewarn.onchange=ondebugCheckedChange;
	enableerror.onchange=ondebugCheckedChange;
	enableweblog.onchange=ondebugCheckedChange;
	function ondebugCheckedChange(e){
		const data={debug:{}};
		data.debug.log=enablelog.checked;
		data.debug.warn=enablewarn.checked;
		data.debug.error=enableerror.checked;
		data.debug.weblog=enableweblog.checked;

		ws.send(JSON.stringify(data));
	}

	let selectedtr=null;
	document.addEventListener('click',(e)=>{
		
		let tr=e.target;
		if (tr instanceof HTMLTableCellElement){
			tr=tr.parentElement;
		}

		if(!(tr instanceof HTMLTableRowElement)) return;
		if(tr.parentElement.tagName.toLowerCase()!=='tbody') return;
				
		if(selectedtr===tr) return;

		if (selectedtr) selectedtr.removeAttribute('selected');
		selectedtr=tr;
		selectedtr.setAttribute('selected', '');
		const ss=[];
		let td=selectedtr.firstElementChild;
		while(td){
			ss.push(td.textContent);
			td=td.nextElementSibling;
		}		
		content.textContent=ss.join('\n');		
	});
}
);
