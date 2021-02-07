// import _ from 'lodash';

import printMe from './print';
import './styles.scss';
import styles from './index.module.scss';

if (process.env.NODE_ENV !== 'production') {
  console.log('Looks like we are in development mode! ', 22);
}
function component() {
  const element = document.createElement('div');
  const btn = document.createElement('button');
  btn.innerHTML = 'Click me and check the console!good';
  btn.onclick = printMe;
  btn.className = styles.btn;
  element.appendChild(btn);

  return element;
}

let element = component(); // 当 print.js 改变导致页面重新渲染时，重新获取渲染的元素
document.body.appendChild(element);

if (module.hot) {
  // 针对这个文件的热更新，就不会使用浏览器刷新，而是局部更新
  module.hot.accept('./print.js', (...args) => {
    console.log(args);
    // 当 print.js 内部发生变更时可以告诉 webpack 接受更新的模块。
    console.log('Accepting the updated printMe module!');
    document.body.removeChild(element);
    element = component(); // 重新渲染页面后，component 更新 click 事件处理
    document.body.appendChild(element);
  });
}
