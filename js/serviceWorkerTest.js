"use strict";
// window.addEventListener('DOMContentLoaded', ()=>{
// // 	const App = top.window.App;
// // 	const CommonFunc=top.window.CommonFunc;
// // 	const myMenu = App.myMenu;
// 	const origin = top.location.origin;			// http://127.0.0.1
// 	const host = top.location.host;				// 127.0.0.1
// 	const hostp= top.location.origin.substr(4)	// ://127.0.0.1或者s://127.0.0.1
	
// }
// );

const resc=[
	/*相对域名根目录*/
	'/favicon.ico',
	'/serviceWorkerTest.html',
	/*相对当前serviceworker所在的目录*/
	'serviceworkers/readme.txt',
	'serviceWorkerTest.js',
];
const cacheName='v2';

//self: ServiceWorkerGlobalScope 全局作用域跟window类似
console.log('self: ', self);
// console.log('caches: ',caches);
self.addEventListener('install', 
	/*ExtendableEvent*/
	event=>{
		console.log('service worker installing...');
		console.log(event);
		
		event.waitUntil(
			caches.open(cacheName).then(cache=>{
				console.log('service worker fetching...');
				return cache.addAll(resc);
			}).then(()=>{				
				console.log('service worker installed');
			})
		);

	}
);

self.addEventListener('activate', 
	event=>{
		console.log('service worker activating...', event);
		const cacheKeeplist=[cacheName];
		/*移除旧的caches*/
		event.waitUntil(
			caches.keys().then(keys=>{
				return Promise.all(keys.map(k=>{
					if(cacheKeeplist.indexOf(k)===-1){
						console.log(`remove cache: ${k}`);
						return caches.delete(k);
					}	
				}));
			})
		);
	}
);

//只会拦截navigator.serviceWorker.register scope的请求及scope文档内的其他请求
self.addEventListener('fetch', 
	event=>{
		console.log('some one fetching:', event);
		event.respondWith(
			caches.match(event.request).then(
				res=>{		
					/*响应缓存中存在的，否则响应fetch网络中的资源*/		
					return res || fetch(event.request).then(result=>{
						/*把新请求的资源加入caches*/
						caches.open(cacheName).then(cache=>{
							cache.put(event.request, result.clone()); //result流只能读一次，所以clone是必须的；
							return result;
						});
					}).catch(err=>{
						/*cache又没有又没网络时*/
// 							return caches.match('serviceworkers/readme.txt');
						return new Response('cache没有，网络也没有，咋搞啊');
					});
				}
			)
		);
		
		/*响应自定义*/
// 		event.respondWith(new Response(
// 			'<p>你被我拦截了，沙雕兽进化...</p>', 
// 			{headers:{'Content-Type':'text/html;charset=utf-8'}}
// 		));
	}
);