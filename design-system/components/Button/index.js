import React from 'react';
import PropTypes from 'prop-types';
import './styles.css';

/**
 * 通用按钮组件
 * 遵循香奈尔设计系统，提供多种风格和尺寸
 */
const Button = ({
  children,
  type = 'primary',
  size = 'medium',
  block = false,
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  onClick,
  ...rest
}) => {
  const baseClass = 'ds-button';
  const typeClass = `${baseClass}--${type}`;
  const sizeClass = `${baseClass}--${size}`;
  const blockClass = block ? `${baseClass}--block` : '';
  const disabledClass = disabled ? `${baseClass}--disabled` : '';
  const loadingClass = loading ? `${baseClass}--loading` : '';
  
  const classes = [
    baseClass,
    typeClass,
    sizeClass,
    blockClass,
    disabledClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || loading) return;
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={classes}
      disabled={disabled}
      onClick={handleClick}
      {...rest}
    >
      {loading && <span className={`${baseClass}__loading`}></span>}
      {icon && <span className={`${baseClass}__icon`}>{icon}</span>}
      <span className={`${baseClass}__text`}>{children}</span>
    </button>
  );
};

Button.propTypes = {
  /**
   * 按钮内容
   */
  children: PropTypes.node.isRequired,
  /**
   * 按钮类型
   */
  type: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'link']),
  /**
   * 按钮尺寸
   */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /**
   * 是否为块级按钮（占满一行）
   */
  block: PropTypes.bool,
  /**
   * 是否禁用
   */
  disabled: PropTypes.bool,
  /**
   * 是否显示加载状态
   */
  loading: PropTypes.bool,
  /**
   * 按钮图标
   */
  icon: PropTypes.node,
  /**
   * 自定义类名
   */
  className: PropTypes.string,
  /**
   * 点击事件处理函数
   */
  onClick: PropTypes.func,
};

export default Button; 