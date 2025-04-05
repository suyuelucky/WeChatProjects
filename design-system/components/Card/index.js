import React from 'react';
import PropTypes from 'prop-types';
import './styles.css';

/**
 * 卡片组件
 * 遵循香奈尔设计系统，提供多种风格和尺寸
 */
const Card = ({
  children,
  title,
  subtitle,
  cover,
  actions,
  variant = 'default',
  size = 'medium',
  className = '',
  onClick,
  ...rest
}) => {
  const baseClass = 'ds-card';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const clickableClass = onClick ? `${baseClass}--clickable` : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    clickableClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {cover && (
        <div className={`${baseClass}__cover`}>
          {typeof cover === 'string' ? (
            <img src={cover} alt={title} />
          ) : (
            cover
          )}
        </div>
      )}
      
      <div className={`${baseClass}__content`}>
        {(title || subtitle) && (
          <div className={`${baseClass}__header`}>
            {title && <h3 className={`${baseClass}__title`}>{title}</h3>}
            {subtitle && <div className={`${baseClass}__subtitle`}>{subtitle}</div>}
          </div>
        )}
        
        <div className={`${baseClass}__body`}>
          {children}
        </div>
        
        {actions && actions.length > 0 && (
          <div className={`${baseClass}__actions`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

Card.propTypes = {
  /**
   * 卡片内容
   */
  children: PropTypes.node,
  /**
   * 卡片标题
   */
  title: PropTypes.node,
  /**
   * 卡片副标题
   */
  subtitle: PropTypes.node,
  /**
   * 卡片封面
   */
  cover: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  /**
   * 卡片操作
   */
  actions: PropTypes.node,
  /**
   * 卡片变体
   */
  variant: PropTypes.oneOf(['default', 'outlined', 'elevated', 'flat']),
  /**
   * 卡片尺寸
   */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /**
   * 自定义类名
   */
  className: PropTypes.string,
  /**
   * 点击事件处理函数
   */
  onClick: PropTypes.func,
};

export default Card; 