'use strict';
// window.websiteMenu=[
// 	{"导出X_T":1},
// 	{"菜单测试":[
// 		{"子菜单1":[
// 			{"子菜单3":1},
// 			{"子菜单4":0}]
// 		},
// 		{"实时通讯":1}]
// 	}
// ];

//file:undefined时将用title的名称作为文件名
//folder:undefined时将用title的名称作为文件夹名
window.websiteMenu=[
	{title:"导出X_T", file:undefined, enable:false},
	{title:"菜单测试", folder:undefined,
	 	file:[
			{title:"子菜单1", folder:undefined,
		 		file:[
					{title:"子菜单3", file:"", enable:true},
					{title:"子菜单4", file:"", enable:false}
		 		]		  
			},
			{title:"实时通讯", file:"实时通讯", enable:true}
	 	]
	}
];