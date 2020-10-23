"use strict";
/*每个页面都放一个作为中转*/
window.myPage = (() => {
  const _listener = [];

  function setPageByStr(s) {
    _dispatchEvent(s)
  }

  function addSetPageListener(func) {
    if (_listener.includes(func)) return false;
    _listener.push(func);
    return true;
  }

  function removeSetPageListener(func) {
    var i = _listener.indexOf(func);
    if (i >= 0) {
      _listener.splice(i, 1);
      return true;
    }
    return false;
  }

  function _dispatchEvent(s) {
    for (var i = 0; i < _listener.length; i++) {
      _listener[i](s);
    }
    return true;
  }

  return {
    setPageByStr: setPageByStr,
    addSetPageListener: addSetPageListener,
    removeSetPageListener: removeSetPageListener
  };

})();

/**
 * 导入函数
 * @param {function} func 
 */
window.import = function (func) {
  return new Function(/\{([\s\S]*)\}$/.exec(func.toString())[1]);
};