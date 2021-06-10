'use strict';
//仅支持一重子菜单
/**
 * [
 * 	{title:string, url:string, disabled:boolean}, 			\\普通按键
 * 	{tille:string, url:[], disabled:boolean},				\\有下拉菜单
 * ]
 * 	url=[]时,与MyMenu的定义方式类似: 
 * 	[
 *      {title:string, url:string, disabled:boolean}		\\菜单按键
 * 		"", 												\\分割符
 * 		[													\\子菜单
 * 			"title",  										\\子菜单标题
 *         	{title:string, url:string, disabled:boolean},	\\子菜单按键
 * 			""												\\分割符
 *      ]
 * 	] 
 */
window.websiteMenu = [
	{
		title: "导出X_T", url: "导出X_T/导出X_T.html", disabled: false
	},
	{
		title: "菜单测试", url: [
			[
				"子菜单1",
				{ title: "子菜单3", url: "", disabled: true },
				"",
				{ title: "子菜单4", url: "菜单测试/研发BOM选件查询/研发BOM选件查询.html", disabled: false },
				{ title: "子菜单5", url: "菜单测试/物料查询/物料查询.html", disabled: false },
				{ title: "子菜单6", url: "菜单测试/物料建档/index.html", disabled: false },
			],
			"",
			{ title: "实时通讯", url: "菜单测试/实时通讯/实时通讯.html", disabled: false }
		], disabled: false
	},
	{ title: "子菜单5", url: "", disabled: false },
];