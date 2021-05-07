"use strict";
(()=>{
  const myPLM=top.myPLM;
  const getParent=top.getParent;
  const SPLITTER_CELL=String.fromCharCode(31);
  const SPLITTER_ROW=String.fromCharCode(30);
  /*data={title:{标题:类型},选件编号:{标题:值，...},...}*/
  var data;//=top.createTableData();//{};
//   Object.defineProperty(data,"title",{value:{}});

  var table=null;
  function handleSubmitSearch(e){
    e.preventDefault();
    const form=this;
    var s=getSubmitData(form);
    var btn=document.getElementById("btnSearch");
    if (btn) setSearchingStatus(btn,true);
//     console.log(s);
    myPLM.myHttpRequest("POST",myPLM.CMDLIST.cmdSearchBOM,s).then(
      function(req){
        s=req.responseText;
        //         console.log(req.responseText);
        data=myPLM.parseRecordsetStr2TableData(s)
        if (s.length!==0) {
          table.setTableData(data);
        }
        if (btn) setSearchingStatus(btn,false);
      },
      function(err){
        console.log(err);
        table.clear();
        if (btn) setSearchingStatus(btn,false);
      }
    );
    
  }
  

  function setSearchingStatus(btn,isSearching){
    if (isSearching){
      btn.classList.add("animate-searching");
    }else{
      btn.classList.remove("animate-searching");
    }
  }

  function getSubmitData(form){
    const ems=form.elements;
    var arr=[];
    var em=null;
    for (var i=0;i<ems.length;i++){
      em=ems[i];
      var t=em.name;
      if (em.type==="checkbox"){
        v=em.checked ? em.value :"";
      }else{
        var v=em.value||"";
        v=trim(v);
      }
      if (t !== "" && v !== ""){
        arr.push(t + "=" + v);
      }
    }
    return arr.join("\r\n");
  }

  function handleDblClick(e){
    var target=e.target;
    if (!(target instanceof HTMLTableCellElement))return;
    var r=getParent(target,HTMLTableRowElement);
    if (!r||r.rowIndex===0) return;
    var i=table.getColumnIndex("选件编号");
    if (i===-1){
      console.error("找不到选件编号");
      return;
    }
    var s=r.cells[i].textContent;
    if (s==="") {
      console.error("选件编号为空");
      return;
    }
    myPLM.openBOMWithID(s);
  }

  function init(){
    document.searchBOM.onsubmit=handleSubmitSearch;
    table=document.getElementById("tbSearchBOM");
    table.addEventListener("dblclick",handleDblClick);
  }
  window.addEventListener('DOMContentLoaded', init);
})();

