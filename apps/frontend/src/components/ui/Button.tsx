import React from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  icon?:     boolean;
  fullWidth?: boolean;
  children:  React.ReactNode;
}

export const Button: React.FC<Props> = ({
  variant = 'primary', size = 'md', loading, icon, fullWidth,
  children, className = '', disabled, ...rest
}) => {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    icon      ? styles.iconBtn  : '',
    fullWidth ? styles.fullWidth : '',
    loading   ? styles.loading  : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
};
