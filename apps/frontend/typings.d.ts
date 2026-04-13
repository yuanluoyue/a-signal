declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.module.scss';
declare module '*.module.sass';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// 修复 antd 组件类型兼容性问题
declare module 'antd' {
  export * from 'antd/es';
}
